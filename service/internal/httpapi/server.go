package httpapi

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"time"

	appstoreconnect "fire/service/app-store-connect"
)

type Config struct {
	Client        *appstoreconnect.Client
	Signer        *appstoreconnect.Signer // nil selects client-signed JWT relay mode
	APIToken      string
	AllowedOrigin string
}

func New(cfg Config) (http.Handler, error) {
	if cfg.APIToken == "" || cfg.Client == nil {
		return nil, errors.New("backend API token and Apple client are required")
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /v1/apps/{appID}/title", func(w http.ResponseWriter, r *http.Request) {
		expected := sha256.Sum256([]byte("Bearer " + cfg.APIToken))
		actual := sha256.Sum256([]byte(r.Header.Get("Authorization")))
		if subtle.ConstantTimeCompare(expected[:], actual[:]) != 1 {
			writeError(w, 401, "backend_authentication", "backend access token required")
			return
		}
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
		token := r.Header.Get("X-App-Store-Token")
		if cfg.Signer != nil {
			if token != "" {
				writeError(w, 400, "invalid_request", "X-App-Store-Token is only accepted in relay mode")
				return
			}
			token, err = cfg.Signer.Token(scope...)
			if err != nil {
				writeError(w, 500, "signing_failed", "unable to sign Apple JWT")
				return
			}
		}
		ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
		defer cancel()
		result, err := cfg.Client.GetTitle(ctx, token, appID, infoID, locale)
		if err != nil {
			sendError(w, err)
			return
		}
		writeJSON(w, 200, result)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		origin := r.Header.Get("Origin")
		if origin != "" {
			w.Header().Add("Vary", "Origin")
			if cfg.AllowedOrigin == "" || origin != cfg.AllowedOrigin {
				writeError(w, 403, "origin_denied", "browser origin is not allowed")
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, X-App-Store-Token")
			w.Header().Set("Access-Control-Expose-Headers", "Retry-After")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		mux.ServeHTTP(w, r)
	}), nil
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
