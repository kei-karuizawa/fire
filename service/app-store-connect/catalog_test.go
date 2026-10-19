package appstoreconnect

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCatalogReadsListingBuildsAndScreenshots(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-token" {
			http.Error(w, "no token", 401)
			return
		}
		switch r.URL.Path {
		case "/v1/apps":
			if r.URL.Query().Get("cursor") == "2" {
				writeJSON(w, map[string]any{"data": []any{app("b", "Bravo", "com.bravo")}})
				return
			}
			writeJSON(w, map[string]any{
				"data":  []any{app("a", "Alpha", "com.alpha")},
				"links": map[string]string{"next": server.URL + "/v1/apps?cursor=2"},
			})
		case "/v1/apps/a":
			writeJSON(w, map[string]any{"data": app("a", "Alpha", "com.alpha")})
		case "/v1/apps/a/appInfos":
			writeJSON(w, map[string]any{"data": []any{map[string]any{
				"type": "appInfos", "id": "info-1",
				"attributes": map[string]any{"appStoreState": "READY_FOR_SALE", "appStoreAgeRating": "4+"},
			}}})
		case "/v1/appInfos/info-1/appInfoLocalizations":
			writeJSON(w, map[string]any{"data": []any{
				loc("loc-zh", map[string]any{"locale": "zh-Hans", "name": "阿尔法", "subtitle": "副标题"}),
				loc("loc-en", map[string]any{"locale": "en-US", "name": "Alpha", "subtitle": "Field notes", "privacyPolicyUrl": "https://example.com/privacy"}),
			}})
		case "/v1/apps/a/appStoreVersions":
			writeJSON(w, map[string]any{"data": []any{
				version("ver-old", "1.0", "2026-01-01T00:00:00Z"),
				version("ver-new", "2.0", "2026-09-01T00:00:00Z"),
			}})
		case "/v1/appStoreVersions/ver-new/appStoreVersionLocalizations":
			writeJSON(w, map[string]any{"data": []any{loc("vloc-en", map[string]any{
				"locale": "en-US", "description": "A trail notebook.", "keywords": "trail,notes",
				"promotionalText": "New maps", "whatsNew": "Offline trails",
				"supportUrl": "https://example.com/help", "marketingUrl": "https://example.com",
			})}})
		case "/v1/appStoreVersions/ver-old/appStoreVersionLocalizations":
			writeJSON(w, map[string]any{"data": []any{}})
		case "/v1/appStoreVersionLocalizations/vloc-en/appScreenshotSets":
			writeJSON(w, map[string]any{"data": []any{loc("set-1", map[string]any{"screenshotDisplayType": "APP_IPHONE_67"})}})
		case "/v1/appScreenshotSets/set-1/appScreenshots":
			writeJSON(w, map[string]any{"data": []any{loc("shot-1", map[string]any{
				"fileName": "home.png",
				"imageAsset": map[string]any{
					"templateUrl": "https://images.example/{w}x{h}bb.{f}",
					"width":       390, "height": 844,
				},
				"assetDeliveryState": map[string]any{"state": "COMPLETE"},
			})}})
		case "/v1/apps/a/builds":
			writeJSON(w, map[string]any{"data": []any{
				loc("build-old", map[string]any{"version": "10", "uploadedDate": "2026-01-02T00:00:00Z", "processingState": "VALID", "expired": true}),
				loc("build-new", map[string]any{"version": "20", "uploadedDate": "2026-10-01T00:00:00Z", "processingState": "PROCESSING", "expired": false, "minOsVersion": "17.0", "usesNonExemptEncryption": false}),
			}})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewClient(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	apps, err := client.ListApps(context.Background(), "test-token")
	if err != nil {
		t.Fatal(err)
	}
	if len(apps) != 2 || apps[0].Name != "Alpha" || apps[1].BundleID != "com.bravo" {
		t.Fatalf("apps=%+v", apps)
	}
	catalog, err := client.GetCatalog(context.Background(), "test-token", "a")
	if err != nil {
		t.Fatal(err)
	}
	if catalog.App.SKU != "SKU" || catalog.AppInfos[0].Localizations[0].Subtitle != "Field notes" {
		t.Fatalf("info=%+v", catalog.AppInfos)
	}
	if catalog.AppInfos[0].Localizations[0].Locale != "en-US" {
		t.Fatal("primary locale was not placed first")
	}
	if len(catalog.Versions) != 2 || catalog.Versions[0].Version != "2.0" {
		t.Fatalf("versions=%+v", catalog.Versions)
	}
	text := catalog.Versions[0].Localizations[0]
	if text.Description != "A trail notebook." || text.Keywords != "trail,notes" || text.WhatsNew != "Offline trails" {
		t.Fatalf("localization=%+v", text)
	}
	shot := text.ScreenshotSets[0].Screenshots[0]
	if shot.URL != "https://images.example/390x844bb.jpg" {
		t.Fatalf("screenshot url=%q", shot.URL)
	}
	if len(catalog.Builds) != 2 || catalog.Builds[0].Version != "20" || catalog.Builds[0].ProcessingState != "PROCESSING" || !catalog.Builds[1].Expired {
		t.Fatalf("builds=%+v", catalog.Builds)
	}
	if catalog.Builds[0].UsesNonExemptEncryption == nil || *catalog.Builds[0].UsesNonExemptEncryption {
		t.Fatal("encryption flag missing")
	}
}

func TestCatalogUsesIncludedResources(t *testing.T) {
	var hits []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits = append(hits, r.URL.Path)
		if strings.HasSuffix(r.URL.Path, "/appInfoLocalizations") || strings.HasSuffix(r.URL.Path, "/appStoreVersionLocalizations") || strings.HasSuffix(r.URL.Path, "/appScreenshots") {
			t.Errorf("separate fetch %s", r.URL.Path)
		}
		switch r.URL.Path {
		case "/v1/apps/a":
			writeJSON(w, map[string]any{"data": app("a", "Alpha", "com.alpha")})
		case "/v1/apps/a/appInfos":
			writeJSON(w, map[string]any{
				"data": []any{map[string]any{
					"type": "appInfos", "id": "info-1",
					"attributes": map[string]any{"appStoreState": "READY_FOR_SALE"},
					"relationships": map[string]any{"appInfoLocalizations": map[string]any{
						"data": []any{map[string]string{"type": "appInfoLocalizations", "id": "loc-en"}},
					}},
				}},
				"included": []any{map[string]any{
					"type": "appInfoLocalizations", "id": "loc-en",
					"attributes": map[string]any{"locale": "en-US", "name": "Alpha", "subtitle": "Field notes"},
				}},
			})
		case "/v1/apps/a/appStoreVersions":
			writeJSON(w, map[string]any{
				"data": []any{map[string]any{
					"type": "appStoreVersions", "id": "ver-new",
					"attributes": map[string]any{"platform": "IOS", "versionString": "2.0", "appStoreState": "READY_FOR_SALE", "createdDate": "2026-09-01T00:00:00Z"},
					"relationships": map[string]any{"appStoreVersionLocalizations": map[string]any{
						"data": []any{map[string]string{"type": "appStoreVersionLocalizations", "id": "vloc-en"}},
					}},
				}},
				"included": []any{map[string]any{
					"type": "appStoreVersionLocalizations", "id": "vloc-en",
					"attributes": map[string]any{"locale": "en-US", "description": "A trail notebook.", "keywords": "trail,notes"},
				}},
			})
		case "/v1/appStoreVersionLocalizations/vloc-en/appScreenshotSets":
			if r.URL.Query().Get("include") != "appScreenshots" {
				t.Errorf("include=%q", r.URL.Query().Get("include"))
			}
			writeJSON(w, map[string]any{
				"data": []any{map[string]any{
					"type": "appScreenshotSets", "id": "set-1",
					"attributes": map[string]any{"screenshotDisplayType": "APP_IPHONE_67"},
					"relationships": map[string]any{"appScreenshots": map[string]any{
						"data": []any{map[string]string{"type": "appScreenshots", "id": "shot-1"}},
					}},
				}},
				"included": []any{map[string]any{
					"type": "appScreenshots", "id": "shot-1",
					"attributes": map[string]any{
						"fileName": "home.png",
						"imageAsset": map[string]any{
							"templateUrl": "https://images.example/{w}x{h}bb.{f}",
							"width":       390, "height": 844,
						},
						"assetDeliveryState": map[string]any{"state": "COMPLETE"},
					},
				}},
			})
		case "/v1/apps/a/builds":
			writeJSON(w, map[string]any{"data": []any{}})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := NewClient(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	catalog, err := client.GetCatalog(context.Background(), "test-token", "a")
	if err != nil {
		t.Fatal(err)
	}
	if catalog.AppInfos[0].Localizations[0].Subtitle != "Field notes" {
		t.Fatalf("info=%+v", catalog.AppInfos)
	}
	text := catalog.Versions[0].Localizations[0]
	if text.Keywords != "trail,notes" || text.ScreenshotSets[0].Screenshots[0].URL != "https://images.example/390x844bb.jpg" {
		t.Fatalf("localization=%+v", text)
	}
	if len(hits) > 6 {
		t.Fatalf("too many requests: %v", hits)
	}
}

func TestCatalogRejectsForeignNextLink(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]any{
			"data":  []any{app("a", "Alpha", "com.alpha")},
			"links": map[string]string{"next": "https://evil.example/v1/apps?cursor=2"},
		})
	}))
	defer server.Close()
	client, err := NewClient(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	_, err = client.ListApps(context.Background(), "test-token")
	var upstream *Error
	if !errorAs(err, &upstream) || upstream.Status != 502 || upstream.Code != "apple_response" {
		t.Fatalf("err=%v", err)
	}
}

func TestCatalogRejectsBadInput(t *testing.T) {
	client, err := NewClient(AppleBaseURL)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.ListApps(context.Background(), ""); err == nil {
		t.Fatal("expected missing token to fail")
	}
	if _, err := client.GetCatalog(context.Background(), "token", "bad id"); err == nil || !strings.Contains(err.Error(), "invalid app ID") {
		t.Fatalf("err=%v", err)
	}
}

func app(id, name, bundle string) map[string]any {
	return map[string]any{"type": "apps", "id": id, "attributes": map[string]any{
		"name": name, "bundleId": bundle, "sku": "SKU", "primaryLocale": "en-US",
	}}
}

func version(id, version, created string) map[string]any {
	return map[string]any{"type": "appStoreVersions", "id": id, "attributes": map[string]any{
		"platform": "IOS", "versionString": version, "appStoreState": "READY_FOR_SALE", "createdDate": created,
	}}
}

func loc(id string, attributes map[string]any) map[string]any {
	return map[string]any{"type": "resource", "id": id, "attributes": attributes}
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(value)
}

func errorAs(err error, target **Error) bool {
	if err == nil {
		return false
	}
	upstream, ok := err.(*Error)
	if !ok {
		return false
	}
	*target = upstream
	return true
}
