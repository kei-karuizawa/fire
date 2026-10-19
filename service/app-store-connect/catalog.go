package appstoreconnect

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
)

const (
	pageLimit     = "200"
	maxListPages  = 20
	catalogBody   = 8 << 20
	catalogFanout = 12
)

// AppSummary is one app visible to the API key.
type AppSummary struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	BundleID      string `json:"bundleId,omitempty"`
	SKU           string `json:"sku,omitempty"`
	PrimaryLocale string `json:"primaryLocale,omitempty"`
}

// Catalog is the store listing and builds for one app.
type Catalog struct {
	App      AppSummary `json:"app"`
	AppInfos []AppInfo  `json:"appInfos"`
	Versions []Version  `json:"versions"`
	Builds   []Build    `json:"builds"`
}

// AppInfo is one editable or live app-info record (title and subtitle live here).
type AppInfo struct {
	ID            string                `json:"id"`
	State         string                `json:"state,omitempty"`
	AgeRating     string                `json:"ageRating,omitempty"`
	Localizations []AppInfoLocalization `json:"localizations"`
}

// AppInfoLocalization is the localized name and subtitle.
type AppInfoLocalization struct {
	Locale           string `json:"locale"`
	Title            string `json:"title,omitempty"`
	Subtitle         string `json:"subtitle,omitempty"`
	PrivacyPolicyURL string `json:"privacyPolicyUrl,omitempty"`
}

// Version is one App Store version across platforms.
type Version struct {
	ID            string                `json:"id"`
	Platform      string                `json:"platform,omitempty"`
	Version       string                `json:"version,omitempty"`
	State         string                `json:"state,omitempty"`
	Copyright     string                `json:"copyright,omitempty"`
	ReleaseType   string                `json:"releaseType,omitempty"`
	CreatedDate   string                `json:"createdDate,omitempty"`
	Localizations []VersionLocalization `json:"localizations"`
}

// VersionLocalization is description, keywords, and screenshots for one locale.
type VersionLocalization struct {
	Locale          string          `json:"locale"`
	Description     string          `json:"description,omitempty"`
	Keywords        string          `json:"keywords,omitempty"`
	PromotionalText string          `json:"promotionalText,omitempty"`
	WhatsNew        string          `json:"whatsNew,omitempty"`
	SupportURL      string          `json:"supportUrl,omitempty"`
	MarketingURL    string          `json:"marketingUrl,omitempty"`
	ScreenshotSets  []ScreenshotSet `json:"screenshotSets"`
}

// ScreenshotSet is one device family of screenshots, in App Store order.
type ScreenshotSet struct {
	DisplayType string       `json:"displayType"`
	Screenshots []Screenshot `json:"screenshots"`
}

// Screenshot is one delivered image. URL is an HTTPS image address when Apple
// has finished processing the asset.
type Screenshot struct {
	FileName string `json:"fileName,omitempty"`
	Width    int    `json:"width,omitempty"`
	Height   int    `json:"height,omitempty"`
	URL      string `json:"url,omitempty"`
}

// Build is one uploaded binary.
type Build struct {
	ID                      string `json:"id"`
	Version                 string `json:"version,omitempty"`
	UploadedDate            string `json:"uploadedDate,omitempty"`
	ExpirationDate          string `json:"expirationDate,omitempty"`
	Expired                 bool   `json:"expired"`
	ProcessingState         string `json:"processingState,omitempty"`
	MinOSVersion            string `json:"minOsVersion,omitempty"`
	UsesNonExemptEncryption *bool  `json:"usesNonExemptEncryption,omitempty"`
}

type resource[T any] struct {
	ID            string              `json:"id"`
	Attributes    T                   `json:"attributes"`
	Relationships map[string]relation `json:"relationships"`
}

type relation struct {
	Data json.RawMessage `json:"data"`
	Meta struct {
		Paging struct {
			Total int `json:"total"`
		} `json:"paging"`
	} `json:"meta"`
}

// ListApps returns every app the Apple token can read.
// The token is unscoped so pagination cursors do not need to be known in advance.
func (c *Client) ListApps(ctx context.Context, token string) ([]AppSummary, error) {
	if err := requireToken(token); err != nil {
		return nil, err
	}
	var records []resource[appAttributes]
	if err := c.collect(ctx, token, "/v1/apps", url.Values{"limit": {pageLimit}}, &records, nil); err != nil {
		return nil, err
	}
	apps := make([]AppSummary, 0, len(records))
	for _, record := range records {
		if record.ID == "" {
			return nil, malformed()
		}
		apps = append(apps, summaryFrom(record))
	}
	sort.Slice(apps, func(i, j int) bool {
		if apps[i].Name == apps[j].Name {
			return apps[i].ID < apps[j].ID
		}
		return strings.ToLower(apps[i].Name) < strings.ToLower(apps[j].Name)
	})
	return apps, nil
}

// GetCatalog reads title, subtitle, version text, screenshots, and builds for one app.
func (c *Client) GetCatalog(ctx context.Context, token, appID string) (Catalog, error) {
	if !resourceID.MatchString(appID) {
		return Catalog{}, &Error{Status: 400, Code: "invalid_request", Message: "invalid app ID"}
	}
	if err := requireToken(token); err != nil {
		return Catalog{}, err
	}
	record, err := c.readApp(ctx, token, appID)
	if err != nil {
		return Catalog{}, err
	}
	catalog := Catalog{App: summaryFrom(record), AppInfos: []AppInfo{}, Versions: []Version{}, Builds: []Build{}}
	err = runLimited(ctx, 3, []func(context.Context) error{
		func(ctx context.Context) error {
			infos, err := c.readAppInfos(ctx, token, appID, catalog.App.PrimaryLocale)
			if err != nil {
				return err
			}
			catalog.AppInfos = infos
			return nil
		},
		func(ctx context.Context) error {
			versions, err := c.readVersions(ctx, token, appID, catalog.App.PrimaryLocale)
			if err != nil {
				return err
			}
			catalog.Versions = versions
			return nil
		},
		func(ctx context.Context) error {
			builds, err := c.readBuilds(ctx, token, appID)
			if err != nil {
				return err
			}
			catalog.Builds = builds
			return nil
		},
	})
	if err != nil {
		return Catalog{}, err
	}
	return catalog, nil
}

type appAttributes struct {
	Name          string `json:"name"`
	BundleID      string `json:"bundleId"`
	SKU           string `json:"sku"`
	PrimaryLocale string `json:"primaryLocale"`
}

func summaryFrom(record resource[appAttributes]) AppSummary {
	return AppSummary{
		ID:            record.ID,
		Name:          record.Attributes.Name,
		BundleID:      record.Attributes.BundleID,
		SKU:           record.Attributes.SKU,
		PrimaryLocale: record.Attributes.PrimaryLocale,
	}
}

func (c *Client) readApp(ctx context.Context, token, appID string) (resource[appAttributes], error) {
	var response struct {
		Data resource[appAttributes] `json:"data"`
	}
	if err := c.get(ctx, token, "/v1/apps/"+appID, nil, &response); err != nil {
		return resource[appAttributes]{}, err
	}
	if response.Data.ID != appID {
		return resource[appAttributes]{}, malformed()
	}
	return response.Data, nil
}

type appInfoAttributes struct {
	AppStoreState     string `json:"appStoreState"`
	State             string `json:"state"`
	AppStoreAgeRating string `json:"appStoreAgeRating"`
}

type appInfoLocAttributes struct {
	Locale           string `json:"locale"`
	Name             string `json:"name"`
	Subtitle         string `json:"subtitle"`
	PrivacyPolicyURL string `json:"privacyPolicyUrl"`
}

func (c *Client) readAppInfos(ctx context.Context, token, appID, primary string) ([]AppInfo, error) {
	var records []resource[appInfoAttributes]
	var included []json.RawMessage
	query := url.Values{"limit": {pageLimit}, "include": {"appInfoLocalizations"}, "limit[appInfoLocalizations]": {"50"}}
	if err := c.collect(ctx, token, "/v1/apps/"+appID+"/appInfos", query, &records, &included); err != nil {
		return nil, err
	}
	index, err := indexIncluded(included)
	if err != nil {
		return nil, err
	}
	infos := make([]AppInfo, len(records))
	tasks := make([]func(context.Context) error, 0)
	for i, record := range records {
		if record.ID == "" || !resourceID.MatchString(record.ID) {
			return nil, malformed()
		}
		state := record.Attributes.AppStoreState
		if state == "" {
			state = record.Attributes.State
		}
		infos[i] = AppInfo{ID: record.ID, State: state, AgeRating: record.Attributes.AppStoreAgeRating, Localizations: []AppInfoLocalization{}}
		if locs, ok := includedLocalizations[appInfoLocAttributes](record.Relationships, index, "appInfoLocalizations"); ok {
			parsed, err := appInfoLocalizations(locs, primary)
			if err != nil {
				return nil, err
			}
			infos[i].Localizations = parsed
			continue
		}
		i, id := i, record.ID
		tasks = append(tasks, func(ctx context.Context) error {
			locs, err := c.readAppInfoLocalizations(ctx, token, id, primary)
			if err != nil {
				return err
			}
			infos[i].Localizations = locs
			return nil
		})
	}
	if err := runLimited(ctx, catalogFanout, tasks); err != nil {
		return nil, err
	}
	return infos, nil
}

func (c *Client) readAppInfoLocalizations(ctx context.Context, token, infoID, primary string) ([]AppInfoLocalization, error) {
	var records []resource[appInfoLocAttributes]
	if err := c.collect(ctx, token, "/v1/appInfos/"+infoID+"/appInfoLocalizations", url.Values{"limit": {pageLimit}}, &records, nil); err != nil {
		return nil, err
	}
	return appInfoLocalizations(records, primary)
}

func appInfoLocalizations(records []resource[appInfoLocAttributes], primary string) ([]AppInfoLocalization, error) {
	locs := make([]AppInfoLocalization, 0, len(records))
	for _, record := range records {
		if record.Attributes.Locale == "" {
			return nil, malformed()
		}
		locs = append(locs, AppInfoLocalization{
			Locale:           record.Attributes.Locale,
			Title:            record.Attributes.Name,
			Subtitle:         record.Attributes.Subtitle,
			PrivacyPolicyURL: record.Attributes.PrivacyPolicyURL,
		})
	}
	sortLocales(locs, primary, func(item AppInfoLocalization) string { return item.Locale })
	return locs, nil
}

type versionAttributes struct {
	Platform      string `json:"platform"`
	VersionString string `json:"versionString"`
	AppStoreState string `json:"appStoreState"`
	Copyright     string `json:"copyright"`
	ReleaseType   string `json:"releaseType"`
	CreatedDate   string `json:"createdDate"`
}

type versionLocAttributes struct {
	Locale          string `json:"locale"`
	Description     string `json:"description"`
	Keywords        string `json:"keywords"`
	PromotionalText string `json:"promotionalText"`
	WhatsNew        string `json:"whatsNew"`
	SupportURL      string `json:"supportUrl"`
	MarketingURL    string `json:"marketingUrl"`
}

func (c *Client) readVersions(ctx context.Context, token, appID, primary string) ([]Version, error) {
	var records []resource[versionAttributes]
	var included []json.RawMessage
	query := url.Values{"limit": {pageLimit}, "include": {"appStoreVersionLocalizations"}, "limit[appStoreVersionLocalizations]": {"50"}}
	if err := c.collect(ctx, token, "/v1/apps/"+appID+"/appStoreVersions", query, &records, &included); err != nil {
		return nil, err
	}
	index, err := indexIncluded(included)
	if err != nil {
		return nil, err
	}
	versions := make([]Version, len(records))
	type pendingShot struct {
		localizationID string
		target         *VersionLocalization
	}
	var shots []pendingShot
	var tasks []func(context.Context) error
	for i, record := range records {
		if record.ID == "" || !resourceID.MatchString(record.ID) {
			return nil, malformed()
		}
		versions[i] = Version{
			ID:            record.ID,
			Platform:      record.Attributes.Platform,
			Version:       record.Attributes.VersionString,
			State:         record.Attributes.AppStoreState,
			Copyright:     record.Attributes.Copyright,
			ReleaseType:   record.Attributes.ReleaseType,
			CreatedDate:   record.Attributes.CreatedDate,
			Localizations: []VersionLocalization{},
		}
		if drafts, ok := includedLocalizations[versionLocAttributes](record.Relationships, index, "appStoreVersionLocalizations"); ok {
			type pair struct {
				id  string
				loc VersionLocalization
			}
			pairs := make([]pair, len(drafts))
			for j, draft := range drafts {
				if draft.ID == "" || !resourceID.MatchString(draft.ID) || draft.Attributes.Locale == "" {
					return nil, malformed()
				}
				pairs[j] = pair{draft.ID, versionLocalization(draft.Attributes)}
			}
			sortLocales(pairs, primary, func(item pair) string { return item.loc.Locale })
			versions[i].Localizations = make([]VersionLocalization, len(pairs))
			for j, item := range pairs {
				versions[i].Localizations[j] = item.loc
				shots = append(shots, pendingShot{item.id, &versions[i].Localizations[j]})
			}
			continue
		}
		i, id := i, record.ID
		tasks = append(tasks, func(ctx context.Context) error {
			locs, err := c.readVersionLocalizations(ctx, token, id, primary)
			if err != nil {
				return err
			}
			versions[i].Localizations = locs
			return nil
		})
	}
	if err := runLimited(ctx, catalogFanout, tasks); err != nil {
		return nil, err
	}
	shotTasks := make([]func(context.Context) error, 0, len(shots))
	for _, shot := range shots {
		shot := shot
		shotTasks = append(shotTasks, func(ctx context.Context) error {
			sets, err := c.readScreenshotSets(ctx, token, shot.localizationID)
			if err != nil {
				return err
			}
			shot.target.ScreenshotSets = sets
			return nil
		})
	}
	if err := runLimited(ctx, catalogFanout, shotTasks); err != nil {
		return nil, err
	}
	sort.SliceStable(versions, func(i, j int) bool {
		if versions[i].CreatedDate == versions[j].CreatedDate {
			return versions[i].Version > versions[j].Version
		}
		return versions[i].CreatedDate > versions[j].CreatedDate
	})
	return versions, nil
}

func versionLocalization(attr versionLocAttributes) VersionLocalization {
	return VersionLocalization{
		Locale:          attr.Locale,
		Description:     attr.Description,
		Keywords:        attr.Keywords,
		PromotionalText: attr.PromotionalText,
		WhatsNew:        attr.WhatsNew,
		SupportURL:      attr.SupportURL,
		MarketingURL:    attr.MarketingURL,
		ScreenshotSets:  []ScreenshotSet{},
	}
}

func (c *Client) readVersionLocalizations(ctx context.Context, token, versionID, primary string) ([]VersionLocalization, error) {
	var records []resource[versionLocAttributes]
	if err := c.collect(ctx, token, "/v1/appStoreVersions/"+versionID+"/appStoreVersionLocalizations", url.Values{"limit": {pageLimit}}, &records, nil); err != nil {
		return nil, err
	}
	locs := make([]VersionLocalization, len(records))
	tasks := make([]func(context.Context) error, len(records))
	for i, record := range records {
		if record.ID == "" || !resourceID.MatchString(record.ID) || record.Attributes.Locale == "" {
			return nil, malformed()
		}
		i, record := i, record
		locs[i] = versionLocalization(record.Attributes)
		tasks[i] = func(ctx context.Context) error {
			sets, err := c.readScreenshotSets(ctx, token, record.ID)
			if err != nil {
				return err
			}
			locs[i].ScreenshotSets = sets
			return nil
		}
	}
	if err := runLimited(ctx, catalogFanout, tasks); err != nil {
		return nil, err
	}
	sortLocales(locs, primary, func(item VersionLocalization) string { return item.Locale })
	return locs, nil
}

type screenshotSetAttributes struct {
	ScreenshotDisplayType string `json:"screenshotDisplayType"`
}

type screenshotAttributes struct {
	FileName   string `json:"fileName"`
	ImageAsset struct {
		TemplateURL string `json:"templateUrl"`
		Width       int    `json:"width"`
		Height      int    `json:"height"`
	} `json:"imageAsset"`
	AssetDeliveryState struct {
		State string `json:"state"`
	} `json:"assetDeliveryState"`
}

func (c *Client) readScreenshotSets(ctx context.Context, token, localizationID string) ([]ScreenshotSet, error) {
	var records []resource[screenshotSetAttributes]
	var included []json.RawMessage
	query := url.Values{"limit": {pageLimit}, "include": {"appScreenshots"}, "limit[appScreenshots]": {"10"}}
	if err := c.collect(ctx, token, "/v1/appStoreVersionLocalizations/"+localizationID+"/appScreenshotSets", query, &records, &included); err != nil {
		return nil, err
	}
	index, err := indexIncluded(included)
	if err != nil {
		return nil, err
	}
	sets := make([]ScreenshotSet, len(records))
	tasks := make([]func(context.Context) error, 0)
	for i, record := range records {
		if record.ID == "" || !resourceID.MatchString(record.ID) || record.Attributes.ScreenshotDisplayType == "" {
			return nil, malformed()
		}
		sets[i] = ScreenshotSet{DisplayType: record.Attributes.ScreenshotDisplayType, Screenshots: []Screenshot{}}
		if shots, ok := includedLocalizations[screenshotAttributes](record.Relationships, index, "appScreenshots"); ok {
			parsed, err := screenshotsFrom(shots)
			if err != nil {
				return nil, err
			}
			sets[i].Screenshots = parsed
			continue
		}
		i, id := i, record.ID
		tasks = append(tasks, func(ctx context.Context) error {
			shots, err := c.readScreenshots(ctx, token, id)
			if err != nil {
				return err
			}
			sets[i].Screenshots = shots
			return nil
		})
	}
	if err := runLimited(ctx, catalogFanout, tasks); err != nil {
		return nil, err
	}
	return sets, nil
}

func (c *Client) readScreenshots(ctx context.Context, token, setID string) ([]Screenshot, error) {
	var records []resource[screenshotAttributes]
	if err := c.collect(ctx, token, "/v1/appScreenshotSets/"+setID+"/appScreenshots", url.Values{"limit": {pageLimit}}, &records, nil); err != nil {
		return nil, err
	}
	return screenshotsFrom(records)
}

func screenshotsFrom(records []resource[screenshotAttributes]) ([]Screenshot, error) {
	shots := make([]Screenshot, 0, len(records))
	for _, record := range records {
		if record.ID == "" {
			return nil, malformed()
		}
		attr := record.Attributes
		shot := Screenshot{FileName: attr.FileName, Width: attr.ImageAsset.Width, Height: attr.ImageAsset.Height}
		state := attr.AssetDeliveryState.State
		if state == "" || state == "COMPLETE" {
			shot.URL = screenshotURL(attr.ImageAsset.TemplateURL, attr.ImageAsset.Width, attr.ImageAsset.Height)
		}
		shots = append(shots, shot)
	}
	return shots, nil
}

func screenshotURL(template string, width, height int) string {
	if width <= 0 || height <= 0 || !strings.HasPrefix(template, "https://") || strings.ContainsAny(template, " \r\n\t") {
		return ""
	}
	resolved := strings.ReplaceAll(template, "{w}", strconv.Itoa(width))
	resolved = strings.ReplaceAll(resolved, "{h}", strconv.Itoa(height))
	resolved = strings.ReplaceAll(resolved, "{f}", "jpg")
	u, err := url.Parse(resolved)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
		return ""
	}
	return resolved
}

type buildAttributes struct {
	Version                 string `json:"version"`
	UploadedDate            string `json:"uploadedDate"`
	ExpirationDate          string `json:"expirationDate"`
	Expired                 bool   `json:"expired"`
	ProcessingState         string `json:"processingState"`
	MinOSVersion            string `json:"minOsVersion"`
	UsesNonExemptEncryption *bool  `json:"usesNonExemptEncryption"`
}

func (c *Client) readBuilds(ctx context.Context, token, appID string) ([]Build, error) {
	var records []resource[buildAttributes]
	if err := c.collect(ctx, token, "/v1/apps/"+appID+"/builds", url.Values{"limit": {pageLimit}}, &records, nil); err != nil {
		return nil, err
	}
	builds := make([]Build, 0, len(records))
	for _, record := range records {
		if record.ID == "" {
			return nil, malformed()
		}
		builds = append(builds, Build{
			ID:                      record.ID,
			Version:                 record.Attributes.Version,
			UploadedDate:            record.Attributes.UploadedDate,
			ExpirationDate:          record.Attributes.ExpirationDate,
			Expired:                 record.Attributes.Expired,
			ProcessingState:         record.Attributes.ProcessingState,
			MinOSVersion:            record.Attributes.MinOSVersion,
			UsesNonExemptEncryption: record.Attributes.UsesNonExemptEncryption,
		})
	}
	sort.SliceStable(builds, func(i, j int) bool {
		if builds[i].UploadedDate == builds[j].UploadedDate {
			return builds[i].Version > builds[j].Version
		}
		return builds[i].UploadedDate > builds[j].UploadedDate
	})
	return builds, nil
}

func (c *Client) collect(ctx context.Context, token, path string, query url.Values, dest any, included *[]json.RawMessage) error {
	next := ""
	var pages []json.RawMessage
	for page := 0; page < maxListPages; page++ {
		var envelope struct {
			Data     json.RawMessage `json:"data"`
			Included json.RawMessage `json:"included"`
			Links    struct {
				Next string `json:"next"`
			} `json:"links"`
		}
		var err error
		if page == 0 {
			err = c.do(ctx, token, c.endpoint(path, query), &envelope, catalogBody)
		} else {
			err = c.do(ctx, token, next, &envelope, catalogBody)
		}
		if err != nil {
			return err
		}
		if len(bytes.TrimSpace(envelope.Data)) == 0 || string(envelope.Data) == "null" {
			break
		}
		pages = append(pages, envelope.Data)
		if included != nil && len(bytes.TrimSpace(envelope.Included)) > 0 && string(envelope.Included) != "null" {
			*included = append(*included, envelope.Included)
		}
		if envelope.Links.Next == "" {
			break
		}
		next, err = c.resolveNext(envelope.Links.Next)
		if err != nil {
			return err
		}
		if page == maxListPages-1 {
			return &Error{Status: 502, Code: "apple_response", Message: "Apple returned too many pages"}
		}
	}
	combined := make([]byte, 0)
	combined = append(combined, '[')
	for _, page := range pages {
		trimmed := bytes.TrimSpace(page)
		if len(trimmed) == 0 || trimmed[0] != '[' || trimmed[len(trimmed)-1] != ']' {
			return malformed()
		}
		inner := bytes.TrimSpace(trimmed[1 : len(trimmed)-1])
		if len(inner) == 0 {
			continue
		}
		if len(combined) > 1 {
			combined = append(combined, ',')
		}
		combined = append(combined, inner...)
	}
	combined = append(combined, ']')
	if err := json.Unmarshal(combined, dest); err != nil {
		return malformed()
	}
	return nil
}

func (c *Client) endpoint(path string, query url.Values) string {
	endpoint := c.baseURL + path
	if len(query) != 0 {
		endpoint += "?" + query.Encode()
	}
	return endpoint
}

func (c *Client) resolveNext(next string) (string, error) {
	base, err := url.Parse(c.baseURL)
	if err != nil || base.Host == "" {
		return "", malformed()
	}
	ref, err := url.Parse(next)
	if err != nil {
		return "", malformed()
	}
	resolved := base.ResolveReference(ref)
	if resolved.User != nil || resolved.Fragment != "" || resolved.Scheme != base.Scheme || !strings.EqualFold(resolved.Host, base.Host) {
		return "", malformed()
	}
	basePath := strings.TrimRight(base.EscapedPath(), "/")
	path := resolved.EscapedPath()
	if !strings.HasPrefix(path, basePath+"/v1/") {
		return "", malformed()
	}
	return resolved.String(), nil
}

func indexIncluded(pages []json.RawMessage) (map[string]json.RawMessage, error) {
	index := map[string]json.RawMessage{}
	for _, page := range pages {
		trimmed := bytes.TrimSpace(page)
		if len(trimmed) == 0 || string(trimmed) == "null" {
			continue
		}
		var docs []json.RawMessage
		if err := json.Unmarshal(trimmed, &docs); err != nil {
			return nil, malformed()
		}
		for _, doc := range docs {
			var head struct {
				Type string `json:"type"`
				ID   string `json:"id"`
			}
			if err := json.Unmarshal(doc, &head); err != nil || head.Type == "" || head.ID == "" {
				return nil, malformed()
			}
			index[head.Type+"/"+head.ID] = doc
		}
	}
	return index, nil
}

func includedLocalizations[T any](rels map[string]relation, index map[string]json.RawMessage, typ string) ([]resource[T], bool) {
	rel, ok := rels[typ]
	if !ok {
		return nil, false
	}
	ids, complete := rel.ids()
	if !complete {
		return nil, false
	}
	out := make([]resource[T], 0, len(ids))
	for _, id := range ids {
		raw, ok := index[typ+"/"+id]
		if !ok {
			return nil, false
		}
		var item resource[T]
		if err := json.Unmarshal(raw, &item); err != nil || item.ID != id {
			return nil, false
		}
		out = append(out, item)
	}
	return out, true
}

func (r relation) ids() ([]string, bool) {
	trimmed := bytes.TrimSpace(r.Data)
	if len(trimmed) == 0 || string(trimmed) == "null" {
		return nil, r.Meta.Paging.Total == 0
	}
	var refs []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(trimmed, &refs); err != nil {
		return nil, false
	}
	ids := make([]string, 0, len(refs))
	for _, ref := range refs {
		if ref.ID == "" || !resourceID.MatchString(ref.ID) {
			return nil, false
		}
		ids = append(ids, ref.ID)
	}
	if r.Meta.Paging.Total > len(ids) {
		return nil, false
	}
	return ids, true
}

func requireToken(token string) error {
	if token == "" || strings.ContainsAny(token, "\r\n\t ") {
		return &Error{Status: 401, Code: "apple_authentication", Message: "a valid Apple JWT is required"}
	}
	return nil
}

func sortLocales[T any](items []T, primary string, locale func(T) string) {
	sort.SliceStable(items, func(i, j int) bool {
		li, lj := locale(items[i]), locale(items[j])
		if li == primary {
			return lj != primary
		}
		if lj == primary {
			return false
		}
		return li < lj
	})
}

func runLimited(ctx context.Context, limit int, tasks []func(context.Context) error) error {
	if len(tasks) == 0 {
		return nil
	}
	if limit < 1 {
		limit = 1
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	sem := make(chan struct{}, limit)
	var wg sync.WaitGroup
	var once sync.Once
	var first error
	for _, task := range tasks {
		select {
		case <-ctx.Done():
			once.Do(func() { first = ctx.Err() })
		case sem <- struct{}{}:
			wg.Add(1)
			go func(task func(context.Context) error) {
				defer wg.Done()
				defer func() { <-sem }()
				if err := task(ctx); err != nil && !errors.Is(err, context.Canceled) {
					once.Do(func() {
						first = err
						cancel()
					})
				}
			}(task)
		}
	}
	wg.Wait()
	if first == nil {
		return nil
	}
	if errors.Is(first, context.DeadlineExceeded) {
		return &Error{Status: 504, Code: "apple_timeout", Message: "Apple request timed out"}
	}
	if errors.Is(first, context.Canceled) {
		return &Error{Status: 502, Code: "apple_unavailable", Message: "unable to reach Apple"}
	}
	return first
}
