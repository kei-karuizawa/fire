package integration

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

// TestTitleSimulation drives the actual running backend through real HTTP.
// Its upstream must be the checked-in Postman simulation, not Apple's live API.
func TestTitleSimulation(t *testing.T) {
	base := os.Getenv("FIRE_TEST_URL")
	if base == "" {
		t.Skip("set FIRE_TEST_URL to a backend wired to the Postman simulation")
	}
	secret := os.Getenv("FIRE_TEST_TOKEN")
	if secret == "" {
		t.Fatal("FIRE_TEST_TOKEN is required")
	}
	client := &http.Client{Timeout: 5 * time.Second}
	for _, tc := range []struct {
		name, path string
		status     int
		expected   string
	}{
		{"title", "/v1/apps/123456789/title", 200, `"title":"My App"`},
		{"localized", "/v1/apps/123456789/title?appInfoId=info-1&locale=zh-Hans", 200, `"title":"我的应用"`},
		{"missing-locale", "/v1/apps/123456789/title?appInfoId=info-1&locale=ja", 404, `"code":"not_found"`},
		{"wrong-app", "/v1/apps/123456789/title?appInfoId=other-app&locale=zh-Hans", 404, `"code":"not_found"`},
		{"apple-auth", "/v1/apps/401/title", 401, `"code":"apple_authentication"`},
		{"apple-permission", "/v1/apps/403/title", 403, `"code":"apple_permission"`},
		{"not-found", "/v1/apps/404/title", 404, `"code":"not_found"`},
		{"rate-limit", "/v1/apps/429/title", 429, `"code":"apple_rate_limit"`},
		{"apple-failure", "/v1/apps/500/title", 502, `"code":"apple_upstream"`},
		{"invalid-json", "/v1/apps/malformed/title", 502, `"code":"apple_response"`},
		{"redirect-refused", "/v1/apps/redirect/title", 502, `"code":"apple_upstream"`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", strings.TrimRight(base, "/")+tc.path, nil)
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", "Bearer "+secret)
			if os.Getenv("FIRE_TEST_AUTH_MODE") == "relay" {
				req.Header.Set("X-App-Store-Token", "synthetic.simulation.token")
			}
			res, err := client.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer res.Body.Close()
			body, err := io.ReadAll(res.Body)
			if err != nil {
				t.Fatal(err)
			}
			if res.StatusCode != tc.status || !strings.Contains(string(body), tc.expected) {
				t.Fatalf("status=%d body=%s", res.StatusCode, body)
			}
			if !json.Valid(body) {
				t.Fatal("invalid JSON")
			}
			if strings.Contains(string(body), "PRIVATE_UPSTREAM_SENTINEL") || strings.Contains(string(body), secret) {
				t.Fatal("upstream detail or credential exposed")
			}
			if tc.status == 429 && res.Header.Get("Retry-After") != "30" {
				t.Fatal("Retry-After missing")
			}
		})
	}
}
