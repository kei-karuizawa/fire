package fire

import (
	"context"
	"encoding/json"
	"sort"
	"strconv"

	"fire/service/asc"
)

func jsonUnmarshal(data []byte, target any) error { return json.Unmarshal(data, target) }

// Submission is an App Review submission.
type Submission struct {
	ID            string           `json:"id"`
	State         string           `json:"state"`
	Platform      string           `json:"platform"`
	SubmittedDate string           `json:"submittedDate"`
	SubmittedBy   string           `json:"submittedBy"`
	VersionID     string           `json:"versionId,omitempty"`
	Version       string           `json:"version,omitempty"`
	VersionState  string           `json:"versionState,omitempty"`
	BuildNumber   string           `json:"buildNumber,omitempty"`
	Items         []SubmissionItem `json:"items"`
}

// SubmissionItem is one thing submitted for review.
type SubmissionItem struct {
	ID    string `json:"id"`
	State string `json:"state"`
	Kind  string `json:"kind"`
}

var itemKinds = []string{"appStoreVersion", "appCustomProductPageVersion", "appStoreVersionExperiment", "appStoreVersionExperimentV2", "appEvent", "backgroundAssetVersion", "gameCenterAchievementVersion"}

func (c *Call) submissions(ctx context.Context, appID string, max int) ([]Submission, error) {
	list, inc, err := c.all(ctx, "/v1/reviewSubmissions", q(
		"filter[app]", appID, "include", "items,appStoreVersionForReview,submittedByActor",
		"limit", strconv.Itoa(min(max, 200)), "limit[items]", "20"), max)
	if err != nil {
		return nil, err
	}
	out := []Submission{}
	for i := range list {
		r := &list[i]
		s := Submission{ID: r.ID, State: r.Str("state"), Platform: r.Str("platform"), SubmittedDate: r.Str("submittedDate"), Items: []SubmissionItem{}}
		if actor := inc.Follow(r, "submittedByActor"); actor != nil {
			name := actor.Str("userFirstName")
			if last := actor.Str("userLastName"); last != "" {
				name += " " + last
			}
			if name == "" {
				name = actor.Str("apiKeyId")
			}
			s.SubmittedBy = name
		}
		if v := inc.Follow(r, "appStoreVersionForReview"); v != nil {
			s.VersionID, s.Version = v.ID, v.Str("versionString")
			s.VersionState = v.Str("appVersionState")
			if s.VersionState == "" {
				s.VersionState = v.Str("appStoreState")
			}
		}
		for _, item := range inc.FollowMany(r, "items") {
			kind := "other"
			for _, k := range itemKinds {
				if _, ok := item.Relationships[k].One(); ok {
					kind = k
					break
				}
			}
			s.Items = append(s.Items, SubmissionItem{ID: item.ID, State: item.Str("state"), Kind: kind})
		}
		out = append(out, s)
	}
	// Submissions that were never sent have no date; keep them first.
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i].SubmittedDate, out[j].SubmittedDate
		if (a == "") != (b == "") {
			return a == ""
		}
		return a > b
	})
	if len(out) > max {
		out = out[:max]
	}
	return out, nil
}

// Submissions lists an app's review submissions with each version's build number.
func (c *Call) Submissions(ctx context.Context, appID string) ([]Submission, error) {
	var subs []Submission
	var versions []Version
	err := parallel(
		func() (err error) { subs, err = c.submissions(ctx, appID, 100); return },
		func() (err error) { versions, err = c.versions(ctx, appID); return },
	)
	if err != nil {
		return nil, err
	}
	builds := map[string]string{}
	for _, v := range versions {
		builds[v.ID] = v.BuildNumber
	}
	for i := range subs {
		subs[i].BuildNumber = builds[subs[i].VersionID]
	}
	return subs, nil
}

// CancelSubmission withdraws a submission from review.
func (c *Call) CancelSubmission(ctx context.Context, appID, submissionID string) ([]Submission, error) {
	if err := c.patch(ctx, "/v1/reviewSubmissions/"+submissionID, "reviewSubmissions", submissionID, map[string]any{"canceled": true}, nil); err != nil {
		return nil, err
	}
	return c.Submissions(ctx, appID)
}

// SubmitVersion creates a review submission for a version and submits it.
func (c *Call) SubmitVersion(ctx context.Context, appID, versionID string) ([]Submission, error) {
	versions, err := c.versions(ctx, appID)
	if err != nil {
		return nil, err
	}
	var version *Version
	for i := range versions {
		if versions[i].ID == versionID {
			version = &versions[i]
		}
	}
	if version == nil {
		return nil, asc.Errorf(404, "not_found", "that version does not belong to this app")
	}
	sub, err := c.create(ctx, "/v1/reviewSubmissions", "reviewSubmissions", map[string]any{"platform": version.Platform}, map[string]any{"app": one("apps", appID)})
	if err != nil {
		return nil, err
	}
	if _, err := c.create(ctx, "/v1/reviewSubmissionItems", "reviewSubmissionItems", nil, map[string]any{
		"reviewSubmission": one("reviewSubmissions", sub.ID), "appStoreVersion": one("appStoreVersions", versionID),
	}); err != nil {
		return nil, err
	}
	if err := c.patch(ctx, "/v1/reviewSubmissions/"+sub.ID, "reviewSubmissions", sub.ID, map[string]any{"submitted": true}, nil); err != nil {
		return nil, err
	}
	return c.Submissions(ctx, appID)
}
