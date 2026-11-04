package fire

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"

	"fire/service/asc"
)

// Build is a build in the builds list.
type Build struct {
	ID              string `json:"id"`
	Number          string `json:"number"`
	Version         string `json:"version"`
	Platform        string `json:"platform"`
	UploadedDate    string `json:"uploadedDate"`
	ExpirationDate  string `json:"expirationDate"`
	Expired         bool   `json:"expired"`
	ProcessingState string `json:"processingState"`
	InternalState   string `json:"internalState"`
	ExternalState   string `json:"externalState"`
	MinOSVersion    string `json:"minOsVersion"`
	// Status is Fire's summary: processing, review, testing, rejected, ready or expired.
	Status string `json:"status"`
}

func buildFrom(r *asc.Resource, inc asc.Included) Build {
	b := Build{
		ID: r.ID, Number: r.Str("version"), UploadedDate: r.Str("uploadedDate"), ExpirationDate: r.Str("expirationDate"),
		Expired: r.Bool("expired"), ProcessingState: r.Str("processingState"), MinOSVersion: r.Str("minOsVersion"),
	}
	if pre := inc.Follow(r, "preReleaseVersion"); pre != nil {
		b.Version, b.Platform = pre.Str("version"), pre.Str("platform")
	}
	if detail := inc.Follow(r, "buildBetaDetail"); detail != nil {
		b.InternalState, b.ExternalState = detail.Str("internalBuildState"), detail.Str("externalBuildState")
	}
	b.Status = buildStatus(b)
	return b
}

func buildStatus(b Build) string {
	switch {
	case b.Expired:
		return "expired"
	case b.ProcessingState == "PROCESSING":
		return "processing"
	case b.ProcessingState == "FAILED" || b.ProcessingState == "INVALID" || b.ExternalState == "BETA_REJECTED":
		return "rejected"
	case b.ExternalState == "WAITING_FOR_BETA_REVIEW" || b.ExternalState == "IN_BETA_REVIEW":
		return "review"
	case b.ExternalState == "IN_BETA_TESTING" || b.InternalState == "IN_BETA_TESTING":
		return "testing"
	}
	return "ready"
}

// buildList returns builds for an app, newest first. platform is IOS, MAC_OS, TV_OS or VISION_OS, or empty for all.
func (c *Call) buildList(ctx context.Context, appID, platform string, max int) ([]Build, error) {
	query := q("filter[app]", appID, "sort", "-uploadedDate", "include", "preReleaseVersion,buildBetaDetail",
		"fields[builds]", "version,uploadedDate,expirationDate,expired,minOsVersion,processingState,preReleaseVersion,buildBetaDetail",
		"limit", strconv.Itoa(min(max, 200)))
	if platform != "" {
		query.Set("filter[preReleaseVersion.platform]", platform)
	}
	list, inc, err := c.all(ctx, "/v1/builds", query, max)
	if err != nil {
		return nil, err
	}
	out := make([]Build, 0, len(list))
	for i := range list {
		out = append(out, buildFrom(&list[i], inc))
	}
	if len(out) > max {
		out = out[:max]
	}
	return out, nil
}

// BuildsPage is the Builds page document.
type BuildsPage struct {
	Builds  []Build     `json:"builds"`
	Groups  []BetaGroup `json:"groups"`
	Testers int         `json:"testers"`
}

// BetaGroup is a TestFlight group.
type BetaGroup struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Internal          bool   `json:"internal"`
	PublicLinkEnabled bool   `json:"publicLinkEnabled"`
	PublicLink        string `json:"publicLink,omitempty"`
	Testers           int    `json:"testers"`
}

// Builds loads builds for one platform with the app's tester groups.
func (c *Call) Builds(ctx context.Context, appID, platform string) (*BuildsPage, error) {
	switch platform {
	case "IOS", "MAC_OS", "TV_OS", "VISION_OS":
	default:
		return nil, asc.Errorf(400, "invalid_request", "platform must be IOS, MAC_OS, TV_OS or VISION_OS")
	}
	page := &BuildsPage{}
	err := parallel(
		func() (err error) { page.Builds, err = c.buildList(ctx, appID, platform, 200); return },
		func() (err error) { page.Groups, err = c.groups(ctx, appID); return },
		func() error {
			doc, err := c.get(ctx, "/v1/betaTesters", q("filter[apps]", appID, "limit", "1", "fields[betaTesters]", "email"))
			if err != nil {
				return err
			}
			page.Testers = doc.Meta.Paging.Total
			return nil
		},
	)
	if err != nil {
		return nil, err
	}
	return page, nil
}

func (c *Call) groups(ctx context.Context, appID string) ([]BetaGroup, error) {
	list, _, err := c.all(ctx, "/v1/betaGroups", q("filter[app]", appID, "limit", "200", "fields[betaGroups]", "name,isInternalGroup,publicLinkEnabled,publicLink,betaTesters", "limit[betaTesters]", "1", "include", "betaTesters"), 500)
	if err != nil {
		return nil, err
	}
	out := make([]BetaGroup, 0, len(list))
	for i := range list {
		r := &list[i]
		g := BetaGroup{ID: r.ID, Name: r.Str("name"), Internal: r.Bool("isInternalGroup"), PublicLinkEnabled: r.Bool("publicLinkEnabled"), PublicLink: r.Str("publicLink")}
		if rel, ok := r.Relationships["betaTesters"]; ok && rel.Meta != nil {
			g.Testers = rel.Meta.Paging.Total
		} else {
			g.Testers = len(rel.Many())
		}
		out = append(out, g)
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Internal != out[j].Internal {
			return out[i].Internal
		}
		return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name)
	})
	return out, nil
}

// BuildDetail is a single build with its TestFlight information.
type BuildDetail struct {
	Build
	BundleID   string      `json:"bundleId"`
	Encryption *bool       `json:"usesNonExemptEncryption"`
	WhatToTest *WhatToTest `json:"whatToTest"`
	Groups     []BetaGroup `json:"groups"`
	Usage      *BuildUsage `json:"usage"`
	Feedback   []Feedback  `json:"feedback"`
}

// WhatToTest is the build's TestFlight notes in one locale.
type WhatToTest struct {
	ID     string `json:"id"`
	Locale string `json:"locale"`
	Text   string `json:"text"`
}

// BuildUsage is TestFlight usage for a build.
type BuildUsage struct {
	Installs int `json:"installs"`
	Sessions int `json:"sessions"`
	Crashes  int `json:"crashes"`
	Feedback int `json:"feedback"`
	Invites  int `json:"invites"`
}

// Feedback is a tester's screenshot or crash submission.
type Feedback struct {
	ID        string `json:"id"`
	Kind      string `json:"kind"`
	Comment   string `json:"comment"`
	Email     string `json:"email"`
	Device    string `json:"device"`
	OSVersion string `json:"osVersion"`
	Created   string `json:"createdDate"`
}

// BuildDetail loads one build. Usage and feedback are best effort: older
// accounts or roles may not have access, and the page works without them.
func (c *Call) BuildDetail(ctx context.Context, buildID string) (*BuildDetail, error) {
	doc, err := c.get(ctx, "/v1/builds/"+buildID, q("include", "preReleaseVersion,buildBetaDetail,app,betaGroups,betaBuildLocalizations"))
	if err != nil {
		return nil, err
	}
	r, err := doc.One()
	if err != nil {
		return nil, err
	}
	inc := asc.Index(doc.Included)
	d := &BuildDetail{Build: buildFrom(&r, inc), Groups: []BetaGroup{}, Feedback: []Feedback{}}
	if raw, ok := r.Attributes["usesNonExemptEncryption"]; ok && string(raw) != "null" {
		v := r.Bool("usesNonExemptEncryption")
		d.Encryption = &v
	}
	appID := r.Rel("app")
	if app := inc.Follow(&r, "app"); app != nil {
		d.BundleID = app.Str("bundleId")
	}
	for _, loc := range inc.FollowMany(&r, "betaBuildLocalizations") {
		w := &WhatToTest{ID: loc.ID, Locale: loc.Str("locale"), Text: loc.Str("whatsNew")}
		if d.WhatToTest == nil || strings.HasPrefix(w.Locale, "en") {
			d.WhatToTest = w
		}
	}
	assigned := map[string]bool{}
	for _, ref := range r.Relationships["betaGroups"].Many() {
		assigned[ref.ID] = true
	}
	_ = parallel(
		func() error {
			if appID == "" {
				return nil
			}
			groups, err := c.groups(ctx, appID)
			if err != nil {
				return nil
			}
			for _, g := range groups {
				if assigned[g.ID] {
					d.Groups = append(d.Groups, g)
				}
			}
			return nil
		},
		func() error {
			doc, err := c.get(ctx, "/v1/builds/"+buildID+"/metrics/betaBuildUsages", nil)
			if err != nil {
				return nil
			}
			var usages []struct {
				DataPoints []struct {
					Values map[string]float64 `json:"values"`
				} `json:"dataPoints"`
			}
			if jsonUnmarshal(doc.Data, &usages) != nil {
				return nil
			}
			u := &BuildUsage{}
			for _, usage := range usages {
				for _, p := range usage.DataPoints {
					u.Installs += int(p.Values["installCount"])
					u.Sessions += int(p.Values["sessionCount"])
					u.Crashes += int(p.Values["crashCount"])
					u.Feedback += int(p.Values["feedbackCount"])
					u.Invites += int(p.Values["inviteCount"])
				}
			}
			d.Usage = u
			return nil
		},
		func() error {
			if appID == "" {
				return nil
			}
			for _, kind := range []string{"betaFeedbackScreenshotSubmissions", "betaFeedbackCrashSubmissions"} {
				list, _, err := c.all(ctx, "/v1/apps/"+appID+"/"+kind, q("filter[build]", buildID, "limit", "20"), 20)
				if err != nil {
					continue
				}
				label := "screenshot"
				if kind == "betaFeedbackCrashSubmissions" {
					label = "crash"
				}
				for i := range list {
					f := &list[i]
					d.Feedback = append(d.Feedback, Feedback{
						ID: f.ID, Kind: label, Comment: f.Str("comment"), Email: f.Str("email"),
						Device: f.Str("deviceModel"), OSVersion: f.Str("osVersion"), Created: f.Str("createdDate"),
					})
				}
			}
			sort.SliceStable(d.Feedback, func(i, j int) bool { return d.Feedback[i].Created > d.Feedback[j].Created })
			return nil
		},
	)
	return d, nil
}

// BuildChange edits a build.
type BuildChange struct {
	WhatToTest *string `json:"whatToTest"`
	Expire     bool    `json:"expire"`
}

// UpdateBuild saves What to Test notes or expires a build.
func (c *Call) UpdateBuild(ctx context.Context, buildID string, ch BuildChange) (*BuildDetail, error) {
	if ch.WhatToTest != nil {
		if utf8.RuneCountInString(*ch.WhatToTest) > 4000 {
			return nil, asc.Errorf(400, "invalid_request", "What to Test is longer than 4,000 characters")
		}
		current, err := c.BuildDetail(ctx, buildID)
		if err != nil {
			return nil, err
		}
		if current.WhatToTest != nil {
			id := current.WhatToTest.ID
			err = c.patch(ctx, "/v1/betaBuildLocalizations/"+id, "betaBuildLocalizations", id, map[string]any{"whatsNew": *ch.WhatToTest}, nil)
		} else {
			_, err = c.create(ctx, "/v1/betaBuildLocalizations", "betaBuildLocalizations",
				map[string]any{"locale": "en-US", "whatsNew": *ch.WhatToTest}, map[string]any{"build": one("builds", buildID)})
		}
		if err != nil {
			return nil, err
		}
	}
	if ch.Expire {
		if err := c.patch(ctx, "/v1/builds/"+buildID, "builds", buildID, map[string]any{"expired": true}, nil); err != nil {
			return nil, err
		}
	}
	return c.BuildDetail(ctx, buildID)
}

// SetBuildGroup adds or removes a beta group's access to a build.
func (c *Call) SetBuildGroup(ctx context.Context, buildID, groupID string, add bool) (*BuildDetail, error) {
	body := map[string]any{"data": []map[string]string{{"type": "builds", "id": buildID}}}
	path := "/v1/betaGroups/" + groupID + "/relationships/builds"
	var err error
	if add {
		err = c.Client.Write(ctx, c.Token, "POST", path, body, nil)
	} else {
		err = c.Client.Delete(ctx, c.Token, path, body)
	}
	if err != nil {
		return nil, err
	}
	return c.BuildDetail(ctx, buildID)
}

// SubmitBetaReview submits a build to TestFlight App Review.
func (c *Call) SubmitBetaReview(ctx context.Context, buildID string) (*BuildDetail, error) {
	if _, err := c.create(ctx, "/v1/betaAppReviewSubmissions", "betaAppReviewSubmissions", nil, map[string]any{"build": one("builds", buildID)}); err != nil {
		return nil, err
	}
	return c.BuildDetail(ctx, buildID)
}

// TesterInvite adds a tester to groups.
type TesterInvite struct {
	Email     string   `json:"email"`
	FirstName string   `json:"firstName"`
	LastName  string   `json:"lastName"`
	GroupIDs  []string `json:"groupIds"`
}

// InviteTester creates a beta tester in the given groups, which sends the invitation.
func (c *Call) InviteTester(ctx context.Context, in TesterInvite) error {
	in.Email = strings.TrimSpace(in.Email)
	if !strings.Contains(in.Email, "@") || len(in.Email) > 254 {
		return asc.Errorf(400, "invalid_request", "enter a valid email address")
	}
	if len(in.GroupIDs) == 0 {
		return asc.Errorf(400, "invalid_request", "choose at least one group")
	}
	refs := []map[string]string{}
	for _, id := range in.GroupIDs {
		if err := ValidID(id); err != nil {
			return err
		}
		refs = append(refs, map[string]string{"type": "betaGroups", "id": id})
	}
	attrs := map[string]any{"email": in.Email}
	if s := strings.TrimSpace(in.FirstName); s != "" {
		attrs["firstName"] = s
	}
	if s := strings.TrimSpace(in.LastName); s != "" {
		attrs["lastName"] = s
	}
	_, err := c.create(ctx, "/v1/betaTesters", "betaTesters", attrs, map[string]any{"betaGroups": map[string]any{"data": refs}})
	return err
}
