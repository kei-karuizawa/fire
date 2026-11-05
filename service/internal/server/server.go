// Package server is Fire's HTTP layer: the JSON API under /api/v1 and the
// embedded web app on every other path.
package server

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"fire/service/asc"
	"fire/service/internal/fire"
)

// Config wires the server.
type Config struct {
	Client *asc.Client
	// Signer is an optional server-side key. Browsers that hold their own key
	// send a token instead, which always takes precedence.
	Signer *asc.Signer
	// Web is the built web app. Nil serves only the API.
	Web fs.FS
	// AllowedOrigins lists extra browser origins (such as a dev server) that may call the API.
	AllowedOrigins []string
	Version        string
	Logger         *log.Logger
}

type server struct {
	cfg     Config
	service *fire.Service
	token   *asc.CachedToken
	index   []byte
}

// New builds the HTTP handler.
func New(cfg Config) (http.Handler, error) {
	if cfg.Client == nil {
		return nil, errors.New("an App Store Connect client is required")
	}
	if cfg.Logger == nil {
		cfg.Logger = log.Default()
	}
	s := &server{cfg: cfg, service: &fire.Service{Client: cfg.Client}}
	if cfg.Signer != nil {
		s.token = &asc.CachedToken{Signer: cfg.Signer}
	}
	if cfg.Web != nil {
		if data, err := fs.ReadFile(cfg.Web, "index.html"); err == nil {
			s.index = data
		}
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/v1/session", s.session)

	mux.HandleFunc("GET /api/v1/apps", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		apps, err := c.Apps(r.Context())
		return map[string]any{"apps": apps}, err
	}))
	mux.HandleFunc("GET /api/v1/apps/icons", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		icons, err := c.AppIcons(r.Context())
		return map[string]any{"icons": icons}, err
	}))
	mux.HandleFunc("GET /api/v1/apps/{app}/overview", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.Overview(r.Context(), r.PathValue("app"))
	}))
	mux.HandleFunc("GET /api/v1/apps/{app}/metadata", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		version := r.URL.Query().Get("version")
		if version != "" {
			if err := fire.ValidID(version); err != nil {
				return nil, err
			}
		}
		return c.Metadata(r.Context(), r.PathValue("app"), version)
	}))
	mux.HandleFunc("PATCH /api/v1/apps/{app}/metadata", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body fire.MetadataChange
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		if err := fire.ValidID(body.VersionID); err != nil {
			return nil, err
		}
		return c.UpdateMetadata(r.Context(), r.PathValue("app"), body)
	}))
	mux.HandleFunc("POST /api/v1/apps/{app}/metadata/locales", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body struct {
			VersionID string `json:"versionId"`
			Locale    string `json:"locale"`
		}
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		if err := fire.ValidID(body.VersionID); err != nil {
			return nil, err
		}
		return c.AddLocale(r.Context(), r.PathValue("app"), body.VersionID, body.Locale)
	}))
	mux.HandleFunc("GET /api/v1/localizations/{id}/screenshots", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		sets, err := c.Screenshots(r.Context(), r.PathValue("id"))
		return map[string]any{"sets": sets}, err
	}))

	mux.HandleFunc("GET /api/v1/apps/{app}/reviews", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		subs, err := c.Submissions(r.Context(), r.PathValue("app"))
		return map[string]any{"submissions": subs}, err
	}))
	mux.HandleFunc("POST /api/v1/apps/{app}/reviews", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body struct {
			VersionID string `json:"versionId"`
		}
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		if err := fire.ValidID(body.VersionID); err != nil {
			return nil, err
		}
		subs, err := c.SubmitVersion(r.Context(), r.PathValue("app"), body.VersionID)
		return map[string]any{"submissions": subs}, err
	}))
	mux.HandleFunc("POST /api/v1/apps/{app}/reviews/{id}/cancel", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		subs, err := c.CancelSubmission(r.Context(), r.PathValue("app"), r.PathValue("id"))
		return map[string]any{"submissions": subs}, err
	}))

	mux.HandleFunc("GET /api/v1/apps/{app}/builds", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		platform := r.URL.Query().Get("platform")
		if platform == "" {
			platform = "IOS"
		}
		return c.Builds(r.Context(), r.PathValue("app"), platform)
	}))
	mux.HandleFunc("POST /api/v1/apps/{app}/testers", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body fire.TesterInvite
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		return map[string]bool{"ok": true}, c.InviteTester(r.Context(), body)
	}))
	mux.HandleFunc("GET /api/v1/builds/{id}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.BuildDetail(r.Context(), r.PathValue("id"))
	}))
	mux.HandleFunc("PATCH /api/v1/builds/{id}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body fire.BuildChange
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		return c.UpdateBuild(r.Context(), r.PathValue("id"), body)
	}))
	mux.HandleFunc("PUT /api/v1/builds/{id}/groups/{group}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.SetBuildGroup(r.Context(), r.PathValue("id"), r.PathValue("group"), true)
	}))
	mux.HandleFunc("DELETE /api/v1/builds/{id}/groups/{group}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.SetBuildGroup(r.Context(), r.PathValue("id"), r.PathValue("group"), false)
	}))
	mux.HandleFunc("POST /api/v1/builds/{id}/beta-review", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.SubmitBetaReview(r.Context(), r.PathValue("id"))
	}))

	mux.HandleFunc("GET /api/v1/apps/{app}/purchases", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.Purchases(r.Context(), r.PathValue("app"))
	}))
	mux.HandleFunc("GET /api/v1/purchases/{kind}/{id}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.Product(r.Context(), r.PathValue("kind"), r.PathValue("id"))
	}))
	mux.HandleFunc("PATCH /api/v1/purchases/{kind}/{id}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body fire.ProductChange
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		return c.UpdateProduct(r.Context(), r.PathValue("kind"), r.PathValue("id"), body)
	}))
	mux.HandleFunc("POST /api/v1/purchases/{kind}/{id}/localizations", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body fire.LocalizationInput
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		return c.AddProductLocalization(r.Context(), r.PathValue("kind"), r.PathValue("id"), body)
	}))
	mux.HandleFunc("PATCH /api/v1/purchases/{kind}/{id}/localizations/{loc}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body fire.LocalizationInput
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		return c.UpdateProductLocalization(r.Context(), r.PathValue("kind"), r.PathValue("id"), r.PathValue("loc"), body)
	}))
	mux.HandleFunc("DELETE /api/v1/purchases/{kind}/{id}/localizations/{loc}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.DeleteProductLocalization(r.Context(), r.PathValue("kind"), r.PathValue("id"), r.PathValue("loc"))
	}))

	mux.HandleFunc("GET /api/v1/apps/{app}/sales", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		query := r.URL.Query()
		return c.Sales(r.Context(), r.PathValue("app"), query.Get("vendor"), query.Get("from"), query.Get("to"))
	}))

	mux.HandleFunc("GET /api/v1/team", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.Team(r.Context())
	}))
	mux.HandleFunc("POST /api/v1/team/invitations", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		var body fire.InviteInput
		if err := decode(r, &body); err != nil {
			return nil, err
		}
		return c.Invite(r.Context(), body)
	}))
	mux.HandleFunc("DELETE /api/v1/team/invitations/{id}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.CancelInvitation(r.Context(), r.PathValue("id"))
	}))
	mux.HandleFunc("DELETE /api/v1/team/users/{id}", s.call(func(r *http.Request, c *fire.Call) (any, error) {
		return c.RemoveUser(r.Context(), r.PathValue("id"))
	}))

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, asc.Errorf(404, "not_found", "unknown API route"))
	})
	mux.HandleFunc("/", s.web)

	return s.middleware(mux), nil
}

func (s *server) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("X-Frame-Options", "DENY")
		if strings.HasPrefix(r.URL.Path, "/api/") {
			h.Set("Cache-Control", "no-store")
			if !s.allowOrigin(w, r) {
				return
			}
		}
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rec, r)
		if strings.HasPrefix(r.URL.Path, "/api/") {
			// Paths and statuses only: never headers, tokens or bodies.
			s.cfg.Logger.Printf("%s %s %d %s", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Millisecond))
		}
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// allowOrigin lets same-origin pages, configured origins and non-browser
// clients through. Other sites cannot use a visitor's browser to call the API.
func (s *server) allowOrigin(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		if site := r.Header.Get("Sec-Fetch-Site"); site == "cross-site" {
			writeError(w, asc.Errorf(403, "origin_denied", "requests from other sites are not allowed"))
			return false
		}
		return true
	}
	w.Header().Add("Vary", "Origin")
	if !s.originAllowed(r, origin) {
		writeError(w, asc.Errorf(403, "origin_denied", "this browser origin is not allowed"))
		return false
	}
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-App-Store-Token")
		w.WriteHeader(http.StatusNoContent)
		return false
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	return true
}

func (s *server) originAllowed(r *http.Request, origin string) bool {
	for _, allowed := range s.cfg.AllowedOrigins {
		if strings.EqualFold(strings.TrimRight(allowed, "/"), origin) {
			return true
		}
	}
	u, err := url.Parse(origin)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return false
	}
	host := r.Host
	if fwd := r.Header.Get("X-Forwarded-Host"); fwd != "" {
		host = strings.TrimSpace(strings.Split(fwd, ",")[0])
	}
	return strings.EqualFold(u.Host, host)
}

func (s *server) session(w http.ResponseWriter, r *http.Request) {
	var key any
	if s.cfg.Signer != nil {
		key = s.cfg.Signer.Info()
	}
	writeJSON(w, 200, map[string]any{"serverKey": key, "version": s.cfg.Version})
}

// call adapts a service function to an HTTP handler.
func (s *server) call(fn func(*http.Request, *fire.Call) (any, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		for _, name := range []string{"app", "id", "group", "loc"} {
			if v := r.PathValue(name); v != "" {
				if err := fire.ValidID(v); err != nil {
					writeError(w, err)
					return
				}
			}
		}
		token := r.Header.Get("X-App-Store-Token")
		if token == "" && s.token != nil {
			var err error
			if token, err = s.token.Token(); err != nil {
				writeError(w, asc.Errorf(500, "signing_failed", "the server could not sign a token with its key"))
				return
			}
		}
		if token == "" {
			writeError(w, asc.Errorf(401, "no_credentials", "connect an App Store Connect API key first"))
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 90*time.Second)
		defer cancel()
		result, err := fn(r.WithContext(ctx), s.service.With(token))
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, 200, result)
	}
}

func decode(r *http.Request, target any) error {
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
		return asc.Errorf(415, "invalid_request", "send JSON")
	}
	dec := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		return asc.Errorf(400, "invalid_request", "invalid JSON body")
	}
	return nil
}

func writeError(w http.ResponseWriter, err error) {
	var e *asc.Error
	if !errors.As(err, &e) {
		e = asc.Errorf(500, "internal_error", "something went wrong")
	}
	if e.Status == 429 && e.RetryAfter != "" && len(e.RetryAfter) < 64 && !strings.ContainsAny(e.RetryAfter, "\r\n") {
		w.Header().Set("Retry-After", e.RetryAfter)
	}
	status := e.Status
	if status < 400 || status > 599 {
		status = 502
	}
	writeJSON(w, status, map[string]any{"error": e})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

const contentSecurityPolicy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
	"img-src 'self' data: blob: https://*.mzstatic.com; font-src 'self' data:; connect-src 'self'; " +
	"object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"

// web serves built assets, and index.html for app routes so deep links work.
func (s *server) web(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if s.index == nil {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		_, _ = io.WriteString(w, "Fire's API is running, but the web app was not built into this binary.\nRun `make build` from the repository root, or `npm run build` in web/ and rebuild.\n")
		return
	}
	name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
	if name != "" && name != "index.html" {
		if info, err := fs.Stat(s.cfg.Web, name); err == nil && !info.IsDir() {
			if strings.HasPrefix(name, "assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			http.ServeFileFS(w, r, s.cfg.Web, name)
			return
		}
		if path.Ext(name) != "" {
			http.NotFound(w, r)
			return
		}
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Content-Security-Policy", contentSecurityPolicy)
	_, _ = w.Write(s.index)
}
