package appstoreconnect

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

const AppleBaseURL = "https://api.appstoreconnect.apple.com"

var resourceID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)
var localeName = regexp.MustCompile(`^[A-Za-z0-9-]{1,35}$`)

type Title struct {
	AppID     string `json:"appId"`
	AppInfoID string `json:"appInfoId,omitempty"`
	Title     string `json:"title"`
	Locale    string `json:"locale"`
	Source    string `json:"source"`
}

type Error struct {
	Status                    int
	Code, Message, RetryAfter string
}

func (e *Error) Error() string { return e.Message }

type Client struct {
	baseURL string
	http    *http.Client
}

// NewClient permits a loopback HTTP URL for local simulation. Real upstreams
// must use HTTPS. Redirects are disabled so JWTs cannot leave the configured host.
func NewClient(baseURL string) (*Client, error) {
	u, err := url.Parse(baseURL)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return nil, errors.New("invalid Apple base URL")
	}
	if u.Scheme != "https" && !(u.Scheme == "http" && (u.Hostname() == "127.0.0.1" || u.Hostname() == "localhost" || u.Hostname() == "::1")) {
		return nil, errors.New("Apple base URL requires HTTPS except on loopback")
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.MaxIdleConnsPerHost = 64
	transport.MaxConnsPerHost = 64
	return &Client{strings.TrimRight(baseURL, "/"), &http.Client{
		Timeout:       10 * time.Second,
		Transport:     transport,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}}, nil
}

// ValidateTitleRequest rejects invalid IDs and requires both localization selectors.
func ValidateTitleRequest(appID, appInfoID, locale string) error {
	if !resourceID.MatchString(appID) {
		return &Error{Status: 400, Code: "invalid_request", Message: "invalid app ID"}
	}
	if (appInfoID == "") != (locale == "") || (appInfoID != "" && (!resourceID.MatchString(appInfoID) || !localeName.MatchString(locale))) {
		return &Error{Status: 400, Code: "invalid_request", Message: "provide both a valid appInfoId and locale, or neither"}
	}
	return nil
}

// GetTitle uses the app record by default, or exactly the requested app-info locale.
func (c *Client) GetTitle(ctx context.Context, token, appID, appInfoID, locale string) (Title, error) {
	if err := ValidateTitleRequest(appID, appInfoID, locale); err != nil {
		return Title{}, err
	}
	if token == "" || strings.ContainsAny(token, "\r\n\t ") {
		return Title{}, &Error{Status: 401, Code: "apple_authentication", Message: "a valid Apple JWT is required"}
	}
	result := Title{AppID: appID, AppInfoID: appInfoID}
	if appInfoID == "" {
		var response struct {
			Data struct {
				ID         string `json:"id"`
				Attributes struct {
					Name          string `json:"name"`
					PrimaryLocale string `json:"primaryLocale"`
				} `json:"attributes"`
			} `json:"data"`
		}
		if err := c.get(ctx, token, "/v1/apps/"+appID, nil, &response); err != nil {
			return Title{}, err
		}
		if response.Data.ID != appID || response.Data.Attributes.Name == "" || response.Data.Attributes.PrimaryLocale == "" {
			return Title{}, malformed()
		}
		result.Title, result.Locale, result.Source = response.Data.Attributes.Name, response.Data.Attributes.PrimaryLocale, "app"
		return result, nil
	}
	// Check the app association directly, avoiding a paginated app-info list.
	var info struct {
		Data struct {
			ID            string `json:"id"`
			Relationships struct {
				App struct {
					Data struct {
						ID string `json:"id"`
					} `json:"data"`
				} `json:"app"`
			} `json:"relationships"`
		} `json:"data"`
	}
	if err := c.get(ctx, token, "/v1/appInfos/"+appInfoID, url.Values{"include": {"app"}}, &info); err != nil {
		return Title{}, err
	}
	if info.Data.ID != appInfoID || info.Data.Relationships.App.Data.ID == "" {
		return Title{}, malformed()
	}
	if info.Data.Relationships.App.Data.ID != appID {
		return Title{}, &Error{Status: 404, Code: "not_found", Message: "app info does not belong to this app"}
	}
	var localizations struct {
		Data []struct {
			Attributes struct {
				Name   string `json:"name"`
				Locale string `json:"locale"`
			} `json:"attributes"`
		} `json:"data"`
	}
	query := url.Values{"filter[locale]": {locale}, "limit": {"1"}}
	if err := c.get(ctx, token, "/v1/appInfos/"+appInfoID+"/appInfoLocalizations", query, &localizations); err != nil {
		return Title{}, err
	}
	if len(localizations.Data) == 0 {
		return Title{}, &Error{Status: 404, Code: "not_found", Message: "requested locale is not available"}
	}
	attributes := localizations.Data[0].Attributes
	if attributes.Locale != locale || attributes.Name == "" {
		return Title{}, malformed()
	}
	result.Title, result.Locale, result.Source = attributes.Name, attributes.Locale, "appInfoLocalization"
	return result, nil
}

func malformed() *Error {
	return &Error{Status: 502, Code: "apple_response", Message: "Apple returned an invalid response"}
}

func (c *Client) get(ctx context.Context, token, path string, query url.Values, target any) error {
	endpoint := c.baseURL + path
	if len(query) != 0 {
		endpoint += "?" + query.Encode()
	}
	return c.do(ctx, token, endpoint, target, 2<<20)
}

func (c *Client) do(ctx context.Context, token, endpoint string, target any, maxBody int64) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return malformed()
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		var timeout interface{ Timeout() bool }
		if errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &timeout) && timeout.Timeout()) {
			return &Error{Status: 504, Code: "apple_timeout", Message: "Apple request timed out"}
		}
		return &Error{Status: 502, Code: "apple_unavailable", Message: "unable to reach Apple"}
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		status, code, message := 502, "apple_upstream", "Apple request failed"
		switch resp.StatusCode {
		case 401:
			status, code, message = 401, "apple_authentication", "Apple rejected the JWT; check key configuration or regenerate the token"
		case 403:
			status, code, message = 403, "apple_permission", "Apple API key cannot access this resource"
		case 404:
			status, code, message = 404, "not_found", "Apple resource not found"
		case 429:
			status, code, message = 429, "apple_rate_limit", "Apple rate limit exceeded; retry later"
		}
		return &Error{Status: status, Code: code, Message: message, RetryAfter: resp.Header.Get("Retry-After")}
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBody+1))
	if err != nil || int64(len(body)) > maxBody {
		return malformed()
	}
	if err := json.Unmarshal(body, target); err != nil {
		return malformed()
	}
	return nil
}

// TitleScope returns the exact Apple requests used for a title lookup.
func TitleScope(appID, appInfoID, locale string) ([]string, error) {
	if err := ValidateTitleRequest(appID, appInfoID, locale); err != nil {
		return nil, err
	}
	if appInfoID == "" {
		return []string{"GET /v1/apps/" + appID}, nil
	}
	return []string{fmt.Sprintf("GET /v1/appInfos/%s?include=app", appInfoID), "GET /v1/appInfos/" + appInfoID + "/appInfoLocalizations?" + url.Values{"filter[locale]": {locale}}.Encode()}, nil
}
