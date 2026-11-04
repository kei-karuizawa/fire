// Package fire turns App Store Connect's JSON:API resources into the smaller
// documents the Fire web app works with, and applies the web app's edits.
package fire

import (
	"context"
	"net/url"
	"sort"
	"strings"
	"sync"

	"fire/service/asc"
)

// Service performs App Store Connect calls on behalf of one request's token.
type Service struct {
	Client *asc.Client
}

// Call is the token-bound view of the service used by one HTTP request.
type Call struct {
	*Service
	Token string
}

// With binds a token to the service.
func (s *Service) With(token string) *Call { return &Call{Service: s, Token: token} }

func (c *Call) get(ctx context.Context, path string, q url.Values) (*asc.Document, error) {
	return c.Client.Get(ctx, c.Token, path, q)
}

func (c *Call) all(ctx context.Context, path string, q url.Values, max int) ([]asc.Resource, asc.Included, error) {
	return c.Client.GetAll(ctx, c.Token, path, q, max)
}

func (c *Call) patch(ctx context.Context, path, kind, id string, attrs map[string]any, rels map[string]any) error {
	data := map[string]any{"type": kind, "id": id}
	if len(attrs) > 0 {
		data["attributes"] = attrs
	}
	if len(rels) > 0 {
		data["relationships"] = rels
	}
	return c.Client.Write(ctx, c.Token, "PATCH", path, map[string]any{"data": data}, nil)
}

func (c *Call) create(ctx context.Context, path, kind string, attrs map[string]any, rels map[string]any) (asc.Resource, error) {
	data := map[string]any{"type": kind}
	if len(attrs) > 0 {
		data["attributes"] = attrs
	}
	if len(rels) > 0 {
		data["relationships"] = rels
	}
	var doc asc.Document
	if err := c.Client.Write(ctx, c.Token, "POST", path, map[string]any{"data": data}, &doc); err != nil {
		return asc.Resource{}, err
	}
	return doc.One()
}

func one(kind, id string) map[string]any {
	return map[string]any{"data": map[string]string{"type": kind, "id": id}}
}

// parallel runs functions concurrently and returns the first error.
func parallel(fns ...func() error) error {
	var wg sync.WaitGroup
	errs := make([]error, len(fns))
	for i, fn := range fns {
		wg.Add(1)
		go func(i int, fn func() error) {
			defer wg.Done()
			errs[i] = fn()
		}(i, fn)
	}
	wg.Wait()
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}

func q(pairs ...string) url.Values {
	v := url.Values{}
	for i := 0; i+1 < len(pairs); i += 2 {
		v.Set(pairs[i], pairs[i+1])
	}
	return v
}

// ValidID rejects IDs that cannot be App Store Connect resource IDs.
func ValidID(ids ...string) error {
	for _, id := range ids {
		if !asc.IDPattern.MatchString(id) {
			return asc.Errorf(400, "invalid_request", "invalid ID")
		}
	}
	return nil
}

// App is an app the key can read.
type App struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	BundleID      string `json:"bundleId"`
	SKU           string `json:"sku"`
	PrimaryLocale string `json:"primaryLocale"`
}

func appFrom(r *asc.Resource) App {
	return App{ID: r.ID, Name: r.Str("name"), BundleID: r.Str("bundleId"), SKU: r.Str("sku"), PrimaryLocale: r.Str("primaryLocale")}
}

// Apps lists every app the key can read, by name.
func (c *Call) Apps(ctx context.Context) ([]App, error) {
	list, _, err := c.all(ctx, "/v1/apps", q("fields[apps]", "name,bundleId,sku,primaryLocale", "limit", "200"), 1000)
	if err != nil {
		return nil, err
	}
	apps := make([]App, 0, len(list))
	for i := range list {
		apps = append(apps, appFrom(&list[i]))
	}
	sort.SliceStable(apps, func(i, j int) bool { return strings.ToLower(apps[i].Name) < strings.ToLower(apps[j].Name) })
	return apps, nil
}

func (c *Call) app(ctx context.Context, appID string) (App, error) {
	doc, err := c.get(ctx, "/v1/apps/"+appID, q("fields[apps]", "name,bundleId,sku,primaryLocale"))
	if err != nil {
		return App{}, err
	}
	r, err := doc.One()
	if err != nil {
		return App{}, err
	}
	return appFrom(&r), nil
}

// Version is an App Store version.
type Version struct {
	ID                  string `json:"id"`
	Platform            string `json:"platform"`
	VersionString       string `json:"versionString"`
	State               string `json:"state"`
	ReleaseType         string `json:"releaseType"`
	EarliestReleaseDate string `json:"earliestReleaseDate,omitempty"`
	Copyright           string `json:"copyright"`
	CreatedDate         string `json:"createdDate"`
	Editable            bool   `json:"editable"`
	BuildID             string `json:"buildId,omitempty"`
	BuildNumber         string `json:"buildNumber,omitempty"`
}

// editableVersionStates are the states in which version metadata can change.
var editableVersionStates = map[string]bool{
	"PREPARE_FOR_SUBMISSION": true, "DEVELOPER_REJECTED": true, "REJECTED": true,
	"METADATA_REJECTED": true, "INVALID_BINARY": true, "READY_FOR_REVIEW": true,
	"WAITING_FOR_REVIEW": true,
}

func versionFrom(r *asc.Resource, inc asc.Included) Version {
	state := r.Str("appVersionState")
	if state == "" {
		state = r.Str("appStoreState")
	}
	v := Version{
		ID: r.ID, Platform: r.Str("platform"), VersionString: r.Str("versionString"), State: state,
		ReleaseType: r.Str("releaseType"), EarliestReleaseDate: r.Str("earliestReleaseDate"),
		Copyright: r.Str("copyright"), CreatedDate: r.Str("createdDate"), Editable: editableVersionStates[state],
		BuildID: r.Rel("build"),
	}
	if b := inc.Follow(r, "build"); b != nil {
		v.BuildNumber = b.Str("version")
	}
	return v
}

func (c *Call) versions(ctx context.Context, appID string) ([]Version, error) {
	list, inc, err := c.all(ctx, "/v1/apps/"+appID+"/appStoreVersions", q("include", "build", "fields[builds]", "version", "limit", "50"), 100)
	if err != nil {
		return nil, err
	}
	out := make([]Version, 0, len(list))
	for i := range list {
		out = append(out, versionFrom(&list[i], inc))
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].CreatedDate > out[j].CreatedDate })
	return out, nil
}

// Overview is the dashboard document for one app.
type Overview struct {
	App         App          `json:"app"`
	Versions    []Version    `json:"versions"`
	Builds      []Build      `json:"builds"`
	Submissions []Submission `json:"submissions"`
	Locales     []LocaleFill `json:"locales"`
}

// LocaleFill reports how complete a version localization is.
type LocaleFill struct {
	Locale string `json:"locale"`
	Filled int    `json:"filled"`
	Total  int    `json:"total"`
}

// Overview loads the app, its versions, recent builds and recent review submissions.
func (c *Call) Overview(ctx context.Context, appID string) (*Overview, error) {
	out := &Overview{}
	err := parallel(
		func() (err error) { out.App, err = c.app(ctx, appID); return },
		func() (err error) { out.Versions, err = c.versions(ctx, appID); return },
		func() (err error) {
			out.Builds, err = c.buildList(ctx, appID, "", 6)
			return
		},
		func() (err error) {
			out.Submissions, err = c.submissions(ctx, appID, 5)
			return
		},
	)
	if err != nil {
		return nil, err
	}
	if len(out.Versions) > 0 {
		locs, _, err := c.all(ctx, "/v1/appStoreVersions/"+out.Versions[0].ID+"/appStoreVersionLocalizations", q("limit", "50"), 200)
		if err != nil {
			return nil, err
		}
		for i := range locs {
			r := &locs[i]
			fill := LocaleFill{Locale: r.Str("locale"), Total: 4}
			for _, f := range []string{"description", "keywords", "supportUrl", "whatsNew"} {
				if strings.TrimSpace(r.Str(f)) != "" {
					fill.Filled++
				}
			}
			out.Locales = append(out.Locales, fill)
		}
		sortLocales(out.Locales, out.App.PrimaryLocale, func(l LocaleFill) string { return l.Locale })
	}
	if out.Locales == nil {
		out.Locales = []LocaleFill{}
	}
	return out, nil
}

func sortLocales[T any](list []T, primary string, locale func(T) string) {
	sort.SliceStable(list, func(i, j int) bool {
		a, b := locale(list[i]), locale(list[j])
		if (a == primary) != (b == primary) {
			return a == primary
		}
		return a < b
	})
}
