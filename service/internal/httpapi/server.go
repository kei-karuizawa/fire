package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	appstoreconnect "fire/service/app-store-connect"
)

type Config struct {
	Client  *appstoreconnect.Client
	Signer  *appstoreconnect.Signer // nil means callers must send a browser-signed JWT
	WebRoot string                  // directory containing index.html; empty serves the API only
}

func New(cfg Config) (http.Handler, error) {
	if cfg.Client == nil {
		return nil, errors.New("Apple client is required")
	}
	api := &handler{cfg: cfg}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /v1/key", api.key)
	mux.HandleFunc("GET /v1/apps", api.listApps)
	mux.HandleFunc("GET /v1/apps/{appID}/catalog", api.catalog)
	mux.HandleFunc("GET /v1/apps/{appID}/title", api.title)
	mux.HandleFunc("GET /", api.page)
	mux.HandleFunc("GET /index.html", api.page)
	mux.HandleFunc("GET /styles.css", api.page)
	mux.HandleFunc("GET /app.js", api.page)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if !allowBrowser(w, r) {
			return
		}
		mux.ServeHTTP(w, r)
	}), nil
}

// allowBrowser permits same-origin pages and non-browser clients. A page on
// another host cannot read responses.
func allowBrowser(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	w.Header().Add("Vary", "Origin")
	if !sameOrigin(r, origin) {
		writeError(w, 403, "origin_denied", "browser origin is not allowed")
		return false
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "X-App-Store-Token")
	w.Header().Set("Access-Control-Expose-Headers", "Retry-After")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return false
	}
	return true
}

func sameOrigin(r *http.Request, origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return false
	}
	if !strings.EqualFold(parsed.Host, r.Host) {
		return false
	}
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if forwarded := r.Header.Get("X-Forwarded-Proto"); forwarded == "http" || forwarded == "https" {
		scheme = forwarded
	}
	return parsed.Scheme == scheme
}

type handler struct {
	cfg Config
}

// appleToken prefers a browser-signed JWT. A local signer is the fallback for curl.
// scope is omitted when nil so list and catalog calls can follow pagination.
func (h *handler) appleToken(w http.ResponseWriter, r *http.Request, scope []string) (string, bool) {
	if token := r.Header.Get("X-App-Store-Token"); token != "" {
		return token, true
	}
	if h.cfg.Signer == nil {
		return "", true
	}
	signed, err := h.cfg.Signer.Token(scope...)
	if err != nil {
		writeError(w, 500, "signing_failed", "unable to sign Apple JWT")
		return "", false
	}
	return signed, true
}

func (h *handler) page(w http.ResponseWriter, r *http.Request) {
	if h.cfg.WebRoot == "" {
		http.NotFound(w, r)
		return
	}
	name := r.URL.Path
	if name == "/" {
		name = "/index.html"
	}
	switch name {
	case "/index.html", "/styles.css", "/app.js":
	default:
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, filepath.Join(h.cfg.WebRoot, filepath.Base(name)))
}

func (h *handler) key(w http.ResponseWriter, r *http.Request) {
	if !rejectQuery(w, r) {
		return
	}
	writeJSON(w, 200, map[string]bool{"backend": h.cfg.Signer != nil})
}

func (h *handler) listApps(w http.ResponseWriter, r *http.Request) {
	if !rejectQuery(w, r) {
		return
	}
	token, ok := h.appleToken(w, r, nil)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	apps, err := h.cfg.Client.ListApps(ctx, token)
	if err != nil {
		sendError(w, err)
		return
	}
	if apps == nil {
		apps = []appstoreconnect.AppSummary{}
	}
	writeJSON(w, 200, map[string]any{"apps": apps})
}

func (h *handler) catalog(w http.ResponseWriter, r *http.Request) {
	if !rejectQuery(w, r) {
		return
	}
	token, ok := h.appleToken(w, r, nil)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	result, err := h.cfg.Client.GetCatalog(ctx, token, r.PathValue("appID"))
	if err != nil {
		sendError(w, err)
		return
	}
	writeJSON(w, 200, result)
}

func (h *handler) title(w http.ResponseWriter, r *http.Request) {
	query, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		writeError(w, 400, "invalid_request", "invalid query encoding")
		return
	}
	for key, values := range query {
		if (key != "locale" && key != "appInfoId") || len(values) != 1 || values[0] == "" {
			writeError(w, 400, "invalid_request", "unknown, empty or repeated query parameter")
			return
		}
	}
	appID, infoID, locale := r.PathValue("appID"), query.Get("appInfoId"), query.Get("locale")
	scope, err := appstoreconnect.TitleScope(appID, infoID, locale)
	if err != nil {
		sendError(w, err)
		return
	}
	token, ok := h.appleToken(w, r, scope)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	result, err := h.cfg.Client.GetTitle(ctx, token, appID, infoID, locale)
	if err != nil {
		sendError(w, err)
		return
	}
	writeJSON(w, 200, result)
}

func rejectQuery(w http.ResponseWriter, r *http.Request) bool {
	if r.URL.RawQuery != "" {
		writeError(w, 400, "invalid_request", "unknown, empty or repeated query parameter")
		return false
	}
	return true
}

func sendError(w http.ResponseWriter, err error) {
	var upstream *appstoreconnect.Error
	if errors.As(err, &upstream) {
		if upstream.Status == 429 && len(upstream.RetryAfter) < 128 && !strings.ContainsAny(upstream.RetryAfter, "\r\n") {
			w.Header().Set("Retry-After", upstream.RetryAfter)
		}
		writeError(w, upstream.Status, upstream.Code, upstream.Message)
		return
	}
	writeError(w, 500, "internal_error", "request failed")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]string{"code": code, "message": message}})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
