package httpapi

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	appstoreconnect "fire/service/app-store-connect"
)

func TestBoundaryAuthenticationAndInput(t *testing.T) {
	client, err := appstoreconnect.NewClient(appstoreconnect.AppleBaseURL)
	if err != nil {
		t.Fatal(err)
	}
	handler, err := New(Config{Client: client})
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name, path, auth, origin, method string
		status                           int
		code                             string
	}{
		{"health", "/healthz", "", "", "GET", 200, ""},
		{"key", "/v1/key", "", "", "GET", 200, ""},
		{"bad-origin", "/v1/apps/123/title", "", "https://other.example", "GET", 403, "origin_denied"},
		{"missing-jwt", "/v1/apps/123/title", "", "", "GET", 401, "apple_authentication"},
		{"locale-only", "/v1/apps/123/title?locale=en-US", "Bearer backend-secret", "", "GET", 400, "invalid_request"},
		{"duplicate-query", "/v1/apps/123/title?locale=en-US&locale=ja", "Bearer backend-secret", "", "GET", 400, "invalid_request"},
		{"malformed-query", "/v1/apps/123/title?locale=%zz", "Bearer backend-secret", "", "GET", 400, "invalid_request"},
		{"unknown-query", "/v1/apps/123/title?keyPath=secret.p8", "Bearer backend-secret", "", "GET", 400, "invalid_request"},
		{"preflight", "/v1/apps/123/title", "", "http://example.com", "OPTIONS", 204, ""},
		{"apps-missing-jwt", "/v1/apps", "", "", "GET", 401, "apple_authentication"},
		{"catalog-missing-jwt", "/v1/apps/123/catalog", "Bearer backend-secret", "", "GET", 401, "apple_authentication"},
		{"catalog-bad-id", "/v1/apps/bad%20id/catalog", "Bearer backend-secret", "", "GET", 400, "invalid_request"},
		{"apps-query", "/v1/apps?limit=1", "Bearer backend-secret", "", "GET", 400, "invalid_request"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			req.Header.Set("Authorization", tc.auth)
			req.Header.Set("Origin", tc.origin)
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, req)
			if recorder.Code != tc.status {
				t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
			}
			if recorder.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("credential-dependent response is cacheable")
			}
			if tc.code != "" {
				var body struct {
					Error struct {
						Code string `json:"code"`
					} `json:"error"`
				}
				if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
					t.Fatal(err)
				}
				if body.Error.Code != tc.code {
					t.Fatalf("code=%q", body.Error.Code)
				}
			}
		})
	}
}

func TestWebUIIsServedFromTheSameOrigin(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "index.html"), []byte("fire-ui"), 0o644); err != nil {
		t.Fatal(err)
	}
	client, err := appstoreconnect.NewClient(appstoreconnect.AppleBaseURL)
	if err != nil {
		t.Fatal(err)
	}
	handler, err := New(Config{Client: client, WebRoot: root})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("GET", "/", nil)
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	if recorder.Code != 200 || recorder.Body.String() != "fire-ui" {
		t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}
