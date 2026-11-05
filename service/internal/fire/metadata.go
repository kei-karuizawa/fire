package fire

import (
	"context"
	"net/url"
	"strconv"
	"strings"
	"unicode/utf8"

	"fire/service/asc"
)

// Metadata is everything the Metadata page edits for one version.
type Metadata struct {
	App          App           `json:"app"`
	Versions     []Version     `json:"versions"`
	Version      *Version      `json:"version"`
	AppInfo      *AppInfo      `json:"appInfo"`
	Locales      []Locale      `json:"locales"`
	ReviewDetail *ReviewDetail `json:"reviewDetail"`
	Categories   []string      `json:"categories"`
}

// AppInfo holds app-level information that is versioned separately.
type AppInfo struct {
	ID                string `json:"id"`
	State             string `json:"state"`
	AgeRating         string `json:"ageRating"`
	PrimaryCategory   string `json:"primaryCategory"`
	SecondaryCategory string `json:"secondaryCategory"`
	Editable          bool   `json:"editable"`
}

// Locale merges an app-info localization with a version localization.
type Locale struct {
	Locale                string `json:"locale"`
	AppInfoLocalizationID string `json:"appInfoLocalizationId,omitempty"`
	VersionLocalizationID string `json:"versionLocalizationId,omitempty"`
	Name                  string `json:"name"`
	Subtitle              string `json:"subtitle"`
	PrivacyPolicyURL      string `json:"privacyPolicyUrl"`
	PrivacyChoicesURL     string `json:"privacyChoicesUrl"`
	Description           string `json:"description"`
	Keywords              string `json:"keywords"`
	PromotionalText       string `json:"promotionalText"`
	WhatsNew              string `json:"whatsNew"`
	SupportURL            string `json:"supportUrl"`
	MarketingURL          string `json:"marketingUrl"`
}

// ReviewDetail is the contact and notes App Review sees.
type ReviewDetail struct {
	ID                  string `json:"id"`
	ContactFirstName    string `json:"contactFirstName"`
	ContactLastName     string `json:"contactLastName"`
	ContactPhone        string `json:"contactPhone"`
	ContactEmail        string `json:"contactEmail"`
	DemoAccountRequired bool   `json:"demoAccountRequired"`
	DemoAccountName     string `json:"demoAccountName"`
	DemoAccountPassword string `json:"demoAccountPassword"`
	Notes               string `json:"notes"`
}

var editableInfoStates = map[string]bool{
	"PREPARE_FOR_SUBMISSION": true, "DEVELOPER_REJECTED": true, "REJECTED": true,
	"WAITING_FOR_REVIEW": true, "READY_FOR_REVIEW": true,
}

// Metadata loads a version's metadata. With versionID empty it picks the
// editable version, or else the newest.
func (c *Call) Metadata(ctx context.Context, appID, versionID string) (*Metadata, error) {
	m := &Metadata{Locales: []Locale{}, Categories: []string{}}
	var infos []asc.Resource
	var infoInc asc.Included
	err := parallel(
		func() (err error) { m.App, err = c.app(ctx, appID); return },
		func() (err error) { m.Versions, err = c.versions(ctx, appID); return },
		func() (err error) {
			infos, infoInc, err = c.all(ctx, "/v1/apps/"+appID+"/appInfos", q("include", "primaryCategory,secondaryCategory", "limit", "10"), 10)
			return
		},
	)
	if err != nil {
		return nil, err
	}
	_ = infoInc
	for i := range m.Versions {
		v := &m.Versions[i]
		if (versionID != "" && v.ID == versionID) || (versionID == "" && v.Editable) {
			m.Version = v
			break
		}
	}
	if m.Version == nil && versionID != "" {
		return nil, asc.Errorf(404, "not_found", "that version does not belong to this app")
	}
	if m.Version == nil && len(m.Versions) > 0 {
		m.Version = &m.Versions[0]
	}
	var info *asc.Resource
	for i := range infos {
		state := infos[i].Str("state")
		if state == "" {
			state = infos[i].Str("appStoreState")
		}
		if info == nil || editableInfoStates[state] {
			info = &infos[i]
			m.AppInfo = &AppInfo{
				ID: info.ID, State: state, AgeRating: info.Str("appStoreAgeRating"),
				PrimaryCategory: info.Rel("primaryCategory"), SecondaryCategory: info.Rel("secondaryCategory"),
				Editable: editableInfoStates[state],
			}
		}
	}
	byLocale := map[string]*Locale{}
	order := []string{}
	locale := func(code string) *Locale {
		if l, ok := byLocale[code]; ok {
			return l
		}
		byLocale[code] = &Locale{Locale: code}
		order = append(order, code)
		return byLocale[code]
	}
	var infoLocs, versionLocs []asc.Resource
	platform := "IOS"
	if m.Version != nil && m.Version.Platform != "" {
		platform = m.Version.Platform
	}
	if platform == "VISION_OS" || platform == "TV_OS" {
		platform = "IOS"
	}
	err = parallel(
		func() (err error) {
			if m.AppInfo == nil {
				return nil
			}
			infoLocs, _, err = c.all(ctx, "/v1/appInfos/"+m.AppInfo.ID+"/appInfoLocalizations", q("limit", "50"), 200)
			return
		},
		func() (err error) {
			if m.Version == nil {
				return nil
			}
			versionLocs, _, err = c.all(ctx, "/v1/appStoreVersions/"+m.Version.ID+"/appStoreVersionLocalizations", q("limit", "50"), 200)
			return
		},
		func() error {
			if m.Version == nil {
				return nil
			}
			doc, err := c.get(ctx, "/v1/appStoreVersions/"+m.Version.ID+"/appStoreReviewDetail", nil)
			if asc.IsNotFound(err) {
				return nil
			}
			if err != nil {
				return err
			}
			r, err := doc.One()
			if err != nil || r.ID == "" {
				return nil
			}
			m.ReviewDetail = &ReviewDetail{
				ID: r.ID, ContactFirstName: r.Str("contactFirstName"), ContactLastName: r.Str("contactLastName"),
				ContactPhone: r.Str("contactPhone"), ContactEmail: r.Str("contactEmail"),
				DemoAccountRequired: r.Bool("demoAccountRequired"), DemoAccountName: r.Str("demoAccountName"),
				DemoAccountPassword: r.Str("demoAccountPassword"), Notes: r.Str("notes"),
			}
			return nil
		},
		func() error {
			cats, _, err := c.all(ctx, "/v1/appCategories", url.Values{"filter[platforms]": {platform}, "exists[parent]": {"false"}, "limit": {"200"}}, 200)
			if err != nil {
				return err
			}
			for _, cat := range cats {
				m.Categories = append(m.Categories, cat.ID)
			}
			return nil
		},
	)
	if err != nil {
		return nil, err
	}
	for i := range infoLocs {
		r := &infoLocs[i]
		l := locale(r.Str("locale"))
		l.AppInfoLocalizationID, l.Name, l.Subtitle = r.ID, r.Str("name"), r.Str("subtitle")
		l.PrivacyPolicyURL, l.PrivacyChoicesURL = r.Str("privacyPolicyUrl"), r.Str("privacyChoicesUrl")
	}
	for i := range versionLocs {
		r := &versionLocs[i]
		l := locale(r.Str("locale"))
		l.VersionLocalizationID = r.ID
		l.Description, l.Keywords, l.PromotionalText = r.Str("description"), r.Str("keywords"), r.Str("promotionalText")
		l.WhatsNew, l.SupportURL, l.MarketingURL = r.Str("whatsNew"), r.Str("supportUrl"), r.Str("marketingUrl")
	}
	for _, code := range order {
		m.Locales = append(m.Locales, *byLocale[code])
	}
	sortLocales(m.Locales, m.App.PrimaryLocale, func(l Locale) string { return l.Locale })
	return m, nil
}

// MetadataChange is a batch of edits from the Metadata page. Only fields
// present in the request are sent to App Store Connect.
type MetadataChange struct {
	VersionID    string             `json:"versionId"`
	AppInfoID    string             `json:"appInfoId"`
	Locales      []LocaleChange     `json:"locales"`
	Version      map[string]*string `json:"version"`
	Categories   map[string]*string `json:"categories"`
	ReviewDetail map[string]any     `json:"reviewDetail"`
}

// LocaleChange edits one locale.
type LocaleChange struct {
	Locale                string             `json:"locale"`
	AppInfoLocalizationID string             `json:"appInfoLocalizationId"`
	VersionLocalizationID string             `json:"versionLocalizationId"`
	Fields                map[string]*string `json:"fields"`
}

var infoFields = map[string]int{"name": 30, "subtitle": 30, "privacyPolicyUrl": 255, "privacyChoicesUrl": 255}
var versionFields = map[string]int{"description": 4000, "keywords": 100, "promotionalText": 170, "whatsNew": 4000, "supportUrl": 255, "marketingUrl": 255}
var reviewFields = map[string]int{"contactFirstName": 100, "contactLastName": 100, "contactPhone": 100, "contactEmail": 255, "demoAccountName": 255, "demoAccountPassword": 255, "notes": 4000}

func limited(field string, value *string, max int) (any, error) {
	if value == nil {
		return nil, nil
	}
	if utf8.RuneCountInString(*value) > max {
		return nil, asc.Errorf(400, "invalid_request", "%s is longer than %d characters", field, max)
	}
	if (strings.HasSuffix(field, "Url") || strings.HasSuffix(field, "URL")) && *value != "" && !strings.HasPrefix(*value, "http://") && !strings.HasPrefix(*value, "https://") {
		return nil, asc.Errorf(400, "invalid_request", "%s must start with http:// or https://", field)
	}
	return *value, nil
}

// UpdateMetadata applies a change batch, then returns fresh metadata.
func (c *Call) UpdateMetadata(ctx context.Context, appID string, ch MetadataChange) (*Metadata, error) {
	current, err := c.Metadata(ctx, appID, ch.VersionID)
	if err != nil {
		return nil, err
	}
	if current.Version == nil || current.Version.ID != ch.VersionID {
		return nil, asc.Errorf(400, "invalid_request", "unknown version")
	}
	if ch.AppInfoID != "" && (current.AppInfo == nil || current.AppInfo.ID != ch.AppInfoID) {
		return nil, asc.Errorf(400, "invalid_request", "unknown app info")
	}
	known := map[string]Locale{}
	for _, l := range current.Locales {
		known[l.Locale] = l
	}
	type job func() error
	var jobs []job
	for _, lc := range ch.Locales {
		l, ok := known[lc.Locale]
		if !ok || l.AppInfoLocalizationID != lc.AppInfoLocalizationID || l.VersionLocalizationID != lc.VersionLocalizationID {
			return nil, asc.Errorf(400, "invalid_request", "unknown localization %q", lc.Locale)
		}
		info, version := map[string]any{}, map[string]any{}
		for field, value := range lc.Fields {
			if max, ok := infoFields[field]; ok {
				v, err := limited(field, value, max)
				if err != nil {
					return nil, err
				}
				info[field] = v
			} else if max, ok := versionFields[field]; ok {
				v, err := limited(field, value, max)
				if err != nil {
					return nil, err
				}
				version[field] = v
			} else {
				return nil, asc.Errorf(400, "invalid_request", "unknown field %q", field)
			}
		}
		if len(info) > 0 {
			if l.AppInfoLocalizationID == "" {
				return nil, asc.Errorf(400, "invalid_request", "%s has no app information localization", lc.Locale)
			}
			id := l.AppInfoLocalizationID
			jobs = append(jobs, func() error {
				return c.patch(ctx, "/v1/appInfoLocalizations/"+id, "appInfoLocalizations", id, info, nil)
			})
		}
		if len(version) > 0 {
			if l.VersionLocalizationID == "" {
				return nil, asc.Errorf(400, "invalid_request", "%s has no version localization", lc.Locale)
			}
			id := l.VersionLocalizationID
			jobs = append(jobs, func() error {
				return c.patch(ctx, "/v1/appStoreVersionLocalizations/"+id, "appStoreVersionLocalizations", id, version, nil)
			})
		}
	}
	if len(ch.Version) > 0 {
		attrs := map[string]any{}
		for field, value := range ch.Version {
			switch field {
			case "releaseType":
				if value == nil || (*value != "MANUAL" && *value != "AFTER_APPROVAL" && *value != "SCHEDULED") {
					return nil, asc.Errorf(400, "invalid_request", "invalid release type")
				}
				attrs[field] = *value
			case "earliestReleaseDate":
				if value == nil || *value == "" {
					attrs[field] = nil
				} else {
					attrs[field] = *value
				}
			case "copyright":
				v, err := limited(field, value, 200)
				if err != nil {
					return nil, err
				}
				attrs[field] = v
			default:
				return nil, asc.Errorf(400, "invalid_request", "unknown field %q", field)
			}
		}
		id := ch.VersionID
		jobs = append(jobs, func() error { return c.patch(ctx, "/v1/appStoreVersions/"+id, "appStoreVersions", id, attrs, nil) })
	}
	if len(ch.Categories) > 0 {
		if current.AppInfo == nil {
			return nil, asc.Errorf(400, "invalid_request", "this app has no app information to edit")
		}
		rels := map[string]any{}
		for field, value := range ch.Categories {
			if field != "primaryCategory" && field != "secondaryCategory" {
				return nil, asc.Errorf(400, "invalid_request", "unknown field %q", field)
			}
			if value == nil || *value == "" {
				rels[field] = map[string]any{"data": nil}
				continue
			}
			if err := ValidID(*value); err != nil {
				return nil, err
			}
			rels[field] = one("appCategories", *value)
		}
		id := current.AppInfo.ID
		jobs = append(jobs, func() error { return c.patch(ctx, "/v1/appInfos/"+id, "appInfos", id, nil, rels) })
	}
	if len(ch.ReviewDetail) > 0 {
		attrs := map[string]any{}
		for field, value := range ch.ReviewDetail {
			if field == "demoAccountRequired" {
				b, ok := value.(bool)
				if !ok {
					return nil, asc.Errorf(400, "invalid_request", "demoAccountRequired must be true or false")
				}
				attrs[field] = b
				continue
			}
			max, ok := reviewFields[field]
			s, isString := value.(string)
			if !ok || !isString {
				return nil, asc.Errorf(400, "invalid_request", "invalid review field %q", field)
			}
			if utf8.RuneCountInString(s) > max {
				return nil, asc.Errorf(400, "invalid_request", "%s is longer than %d characters", field, max)
			}
			attrs[field] = s
		}
		if current.ReviewDetail != nil {
			id := current.ReviewDetail.ID
			jobs = append(jobs, func() error {
				return c.patch(ctx, "/v1/appStoreReviewDetails/"+id, "appStoreReviewDetails", id, attrs, nil)
			})
		} else {
			versionID := ch.VersionID
			jobs = append(jobs, func() error {
				_, err := c.create(ctx, "/v1/appStoreReviewDetails", "appStoreReviewDetails", attrs, map[string]any{"appStoreVersion": one("appStoreVersions", versionID)})
				return err
			})
		}
	}
	for _, j := range jobs {
		if err := j(); err != nil {
			return nil, err
		}
	}
	return c.Metadata(ctx, appID, ch.VersionID)
}

// AddLocale creates the app-info and version localizations for a new language.
func (c *Call) AddLocale(ctx context.Context, appID, versionID, locale string) (*Metadata, error) {
	if !localePattern(locale) {
		return nil, asc.Errorf(400, "invalid_request", "invalid locale")
	}
	current, err := c.Metadata(ctx, appID, versionID)
	if err != nil {
		return nil, err
	}
	if current.Version == nil {
		return nil, asc.Errorf(400, "invalid_request", "this app has no App Store version yet")
	}
	var existing *Locale
	for i := range current.Locales {
		if strings.EqualFold(current.Locales[i].Locale, locale) {
			existing = &current.Locales[i]
		}
	}
	if current.AppInfo != nil && (existing == nil || existing.AppInfoLocalizationID == "") {
		if _, err := c.create(ctx, "/v1/appInfoLocalizations", "appInfoLocalizations",
			map[string]any{"locale": locale, "name": current.App.Name},
			map[string]any{"appInfo": one("appInfos", current.AppInfo.ID)}); err != nil {
			return nil, err
		}
	}
	if existing == nil || existing.VersionLocalizationID == "" {
		if _, err := c.create(ctx, "/v1/appStoreVersionLocalizations", "appStoreVersionLocalizations",
			map[string]any{"locale": locale},
			map[string]any{"appStoreVersion": one("appStoreVersions", current.Version.ID)}); err != nil {
			return nil, err
		}
	}
	return c.Metadata(ctx, appID, current.Version.ID)
}

func localePattern(s string) bool {
	if len(s) < 2 || len(s) > 16 {
		return false
	}
	for _, r := range s {
		if !(r == '-' || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')) {
			return false
		}
	}
	return true
}

// ScreenshotSet is the screenshots for one display type.
type ScreenshotSet struct {
	ID          string       `json:"id"`
	DisplayType string       `json:"displayType"`
	Screenshots []Screenshot `json:"screenshots"`
}

// Screenshot is one uploaded screenshot.
type Screenshot struct {
	ID       string `json:"id"`
	FileName string `json:"fileName"`
	URL      string `json:"url"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
}

// Screenshots lists screenshot sets for a version localization.
func (c *Call) Screenshots(ctx context.Context, localizationID string) ([]ScreenshotSet, error) {
	sets, inc, err := c.all(ctx, "/v1/appStoreVersionLocalizations/"+localizationID+"/appScreenshotSets",
		q("include", "appScreenshots", "limit", "50", "limit[appScreenshots]", "10"), 50)
	if err != nil {
		return nil, err
	}
	out := []ScreenshotSet{}
	for i := range sets {
		set := ScreenshotSet{ID: sets[i].ID, DisplayType: sets[i].Str("screenshotDisplayType"), Screenshots: []Screenshot{}}
		for _, shot := range inc.FollowMany(&sets[i], "appScreenshots") {
			var asset struct {
				TemplateURL string `json:"templateUrl"`
				Width       int    `json:"width"`
				Height      int    `json:"height"`
			}
			shot.Decode("imageAsset", &asset)
			s := Screenshot{ID: shot.ID, FileName: shot.Str("fileName"), Width: asset.Width, Height: asset.Height}
			if asset.TemplateURL != "" && asset.Width > 0 && asset.Height > 0 {
				// Ask for a thumbnail 400 pixels tall.
				h := 400
				w := asset.Width * h / asset.Height
				s.URL = strings.NewReplacer("{w}", strconv.Itoa(w), "{h}", strconv.Itoa(h), "{f}", "png").Replace(asset.TemplateURL)
			}
			set.Screenshots = append(set.Screenshots, s)
		}
		out = append(out, set)
	}
	return out, nil
}
