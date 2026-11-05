package server

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"fire/service/asc"
	"fire/service/internal/mockapple"
)

// newTestServer runs Fire against the simulated App Store Connect API.
func newTestServer(t *testing.T, withKey bool) *httptest.Server {
	t.Helper()
	apple := httptest.NewServer(mockapple.New())
	t.Cleanup(apple.Close)
	client, err := asc.NewClient(apple.URL)
	if err != nil {
		t.Fatal(err)
	}
	cfg := Config{
		Client:  client,
		Web:     fstest.MapFS{"index.html": {Data: []byte("<!doctype html><title>Fire</title>")}},
		Version: "test",
		Logger:  log.New(io.Discard, "", 0),
	}
	if withKey {
		key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		der, _ := x509.MarshalPKCS8PrivateKey(key)
		cfg.Signer, err = asc.NewSigner(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der}), "TEST000001", "00000000-0000-0000-0000-000000000000", asc.TeamKey)
		if err != nil {
			t.Fatal(err)
		}
	}
	handler, err := New(cfg)
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	return server
}

func call(t *testing.T, server *httptest.Server, method, path, body string, headers map[string]string) (int, map[string]any) {
	t.Helper()
	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req, _ := http.NewRequest(method, server.URL+path, reader)
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	out := map[string]any{}
	json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func TestAppsAndMetadataRoundTrip(t *testing.T) {
	server := newTestServer(t, true)
	status, body := call(t, server, "GET", "/api/v1/apps", "", nil)
	if status != 200 {
		t.Fatalf("apps: %d %v", status, body)
	}
	apps := body["apps"].([]any)
	if len(apps) == 0 {
		t.Fatal("no apps")
	}
	appID := apps[0].(map[string]any)["id"].(string)

	status, meta := call(t, server, "GET", "/api/v1/apps/"+appID+"/metadata", "", nil)
	if status != 200 {
		t.Fatalf("metadata: %d %v", status, meta)
	}
	version := meta["version"].(map[string]any)
	locale := meta["locales"].([]any)[0].(map[string]any)
	change := map[string]any{
		"versionId": version["id"],
		"locales": []any{map[string]any{
			"locale":                locale["locale"],
			"appInfoLocalizationId": locale["appInfoLocalizationId"],
			"versionLocalizationId": locale["versionLocalizationId"],
			"fields":                map[string]any{"promotionalText": "Now with focus timers"},
		}},
	}
	payload, _ := json.Marshal(change)
	if status, out := call(t, server, "PATCH", "/api/v1/apps/"+appID+"/metadata", string(payload), nil); status != 200 {
		t.Fatalf("patch: %d %v", status, out)
	}
	_, meta = call(t, server, "GET", "/api/v1/apps/"+appID+"/metadata", "", nil)
	saved := meta["locales"].([]any)[0].(map[string]any)
	if saved["promotionalText"] != "Now with focus timers" {
		t.Fatalf("promotional text not saved: %v", saved["promotionalText"])
	}
}

func TestNoCredentials(t *testing.T) {
	server := newTestServer(t, false)
	status, body := call(t, server, "GET", "/api/v1/apps", "", nil)
	if status != 401 || body["error"].(map[string]any)["code"] != "no_credentials" {
		t.Fatalf("got %d %v", status, body)
	}
	if status, _ := call(t, server, "GET", "/api/v1/apps", "", map[string]string{"X-App-Store-Token": "not-a-jwt"}); status == 200 {
		t.Fatal("a malformed browser token was accepted")
	}
}

func TestCrossSiteRequestsAreRefused(t *testing.T) {
	server := newTestServer(t, true)
	status, _ := call(t, server, "PATCH", "/api/v1/builds/build-186", `{"whatToTest":"x"}`, map[string]string{"Origin": "https://evil.example"})
	if status != 403 {
		t.Fatalf("cross-site write got %d", status)
	}
}

func TestRoutingAndWebFallback(t *testing.T) {
	server := newTestServer(t, true)
	if status, _ := call(t, server, "GET", "/api/v1/nope", "", nil); status != 404 {
		t.Fatalf("unknown API route got %d", status)
	}
	res, err := http.Get(server.URL + "/apps/123/builds")
	if err != nil {
		t.Fatal(err)
	}
	page, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 || !strings.Contains(string(page), "<title>Fire</title>") {
		t.Fatalf("app route got %d %q", res.StatusCode, page)
	}
	if res.Header.Get("Content-Security-Policy") == "" {
		t.Fatal("missing Content-Security-Policy")
	}
	if status, body := call(t, server, "GET", "/api/v1/session", "", nil); status != 200 || body["serverKey"] == nil {
		t.Fatalf("session got %d %v", status, body)
	}
}

func TestUnknownFieldsAreRejected(t *testing.T) {
	server := newTestServer(t, true)
	status, _ := call(t, server, "PATCH", "/api/v1/builds/build-186", `{"whatToTest":"x","admin":true}`, nil)
	if status != 400 {
		t.Fatalf("got %d", status)
	}
}

func TestAppIconsSkipBuildsWithoutOne(t *testing.T) {
	server := newTestServer(t, true)
	status, body := call(t, server, "GET", "/api/v1/apps/icons", "", nil)
	if status != 200 {
		t.Fatalf("icons: %d %v", status, body)
	}
	icons := body["icons"].(map[string]any)
	// Ember's newest build is still processing, so its icon comes from the one before.
	if icon, _ := icons["6447102938"].(string); !strings.HasPrefix(icon, "data:image/svg+xml") {
		t.Fatalf("ember icon: %q", icon)
	}
	// Flint has no builds, so it has no icon.
	if _, ok := icons["6451873320"]; ok {
		t.Fatalf("flint has an icon: %v", icons)
	}
}
