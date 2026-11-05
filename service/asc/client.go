package asc

import (
	"bytes"
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

// AppleBaseURL is the production App Store Connect API.
const AppleBaseURL = "https://api.appstoreconnect.apple.com"

// IDPattern matches App Store Connect resource IDs.
var IDPattern = regexp.MustCompile(`^[A-Za-z0-9._-]{1,128}$`)

// Error is an API failure that is safe to show to a user.
type Error struct {
	Status     int    `json:"-"`
	Code       string `json:"code"`
	Message    string `json:"message"`
	RetryAfter string `json:"-"`
}

func (e *Error) Error() string { return e.Message }

// Errorf builds an Error.
func Errorf(status int, code, format string, args ...any) *Error {
	return &Error{Status: status, Code: code, Message: fmt.Sprintf(format, args...)}
}

// IsNotFound reports whether err is a 404 from Apple.
func IsNotFound(err error) bool {
	var e *Error
	return errors.As(err, &e) && e.Status == http.StatusNotFound
}

// Client talks to App Store Connect. Each call takes the bearer token to use,
// so one client can serve many keys.
type Client struct {
	baseURL string
	http    *http.Client
}

// NewClient accepts HTTPS URLs, or HTTP on loopback for local simulation.
// Redirects are refused so tokens never leave the configured host.
func NewClient(baseURL string) (*Client, error) {
	u, err := url.Parse(baseURL)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return nil, errors.New("invalid App Store Connect base URL")
	}
	loopback := u.Hostname() == "127.0.0.1" || u.Hostname() == "localhost" || u.Hostname() == "::1"
	if u.Scheme != "https" && !(u.Scheme == "http" && loopback) {
		return nil, errors.New("App Store Connect base URL must use HTTPS (HTTP is allowed on loopback only)")
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.MaxIdleConnsPerHost = 32
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http: &http.Client{
			Timeout:       30 * time.Second,
			Transport:     transport,
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
	}, nil
}

// Resource is one JSON:API resource object.
type Resource struct {
	Type          string                     `json:"type"`
	ID            string                     `json:"id"`
	Attributes    map[string]json.RawMessage `json:"attributes,omitempty"`
	Relationships map[string]Relationship    `json:"relationships,omitempty"`
}

// Relationship holds linkage to related resources, either one or many.
type Relationship struct {
	Data json.RawMessage `json:"data,omitempty"`
	Meta *struct {
		Paging struct {
			Total int `json:"total"`
		} `json:"paging"`
	} `json:"meta,omitempty"`
}

// Ref identifies a resource.
type Ref struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

// One returns the single linked resource, if any.
func (r Relationship) One() (Ref, bool) {
	var ref *Ref
	if len(r.Data) == 0 || json.Unmarshal(r.Data, &ref) != nil || ref == nil {
		return Ref{}, false
	}
	return *ref, true
}

// Many returns linked resources.
func (r Relationship) Many() []Ref {
	var refs []Ref
	_ = json.Unmarshal(r.Data, &refs)
	return refs
}

// Str reads a string attribute.
func (r *Resource) Str(name string) string {
	var s string
	if raw, ok := r.Attributes[name]; ok {
		_ = json.Unmarshal(raw, &s)
	}
	return s
}

// Bool reads a boolean attribute.
func (r *Resource) Bool(name string) bool {
	var b bool
	if raw, ok := r.Attributes[name]; ok {
		_ = json.Unmarshal(raw, &b)
	}
	return b
}

// Int reads an integer attribute.
func (r *Resource) Int(name string) int {
	var n float64
	if raw, ok := r.Attributes[name]; ok {
		_ = json.Unmarshal(raw, &n)
	}
	return int(n)
}

// Decode unmarshals an attribute into target.
func (r *Resource) Decode(name string, target any) {
	if raw, ok := r.Attributes[name]; ok {
		_ = json.Unmarshal(raw, target)
	}
}

// StrList reads a string array attribute.
func (r *Resource) StrList(name string) []string {
	var list []string
	r.Decode(name, &list)
	return list
}

// Rel returns the single linked resource ID for a relationship.
func (r *Resource) Rel(name string) string {
	ref, _ := r.Relationships[name].One()
	return ref.ID
}

// Document is a JSON:API response.
type Document struct {
	Data     json.RawMessage `json:"data"`
	Included []Resource      `json:"included"`
	Links    struct {
		Next string `json:"next"`
	} `json:"links"`
	Meta struct {
		Paging struct {
			Total int `json:"total"`
		} `json:"paging"`
	} `json:"meta"`
}

// One decodes a single primary resource.
func (d *Document) One() (Resource, error) {
	var r Resource
	if err := json.Unmarshal(d.Data, &r); err != nil {
		return r, malformed()
	}
	return r, nil
}

// Many decodes the primary resource list.
func (d *Document) Many() ([]Resource, error) {
	var list []Resource
	if len(d.Data) == 0 || string(d.Data) == "null" {
		return nil, nil
	}
	if err := json.Unmarshal(d.Data, &list); err != nil {
		return nil, malformed()
	}
	return list, nil
}

// Included indexes included resources by type and ID.
type Included map[string]*Resource

func key(kind, id string) string { return kind + "/" + id }

// Index builds a lookup table from included resources.
func Index(lists ...[]Resource) Included {
	out := Included{}
	for _, list := range lists {
		for i := range list {
			out[key(list[i].Type, list[i].ID)] = &list[i]
		}
	}
	return out
}

// Get returns the included resource, or nil.
func (in Included) Get(kind, id string) *Resource { return in[key(kind, id)] }

// Follow returns the included resource for a to-one relationship.
func (in Included) Follow(r *Resource, rel string) *Resource {
	ref, ok := r.Relationships[rel].One()
	if !ok {
		return nil
	}
	return in.Get(ref.Type, ref.ID)
}

// FollowMany returns included resources for a to-many relationship.
func (in Included) FollowMany(r *Resource, rel string) []*Resource {
	var out []*Resource
	for _, ref := range r.Relationships[rel].Many() {
		if found := in.Get(ref.Type, ref.ID); found != nil {
			out = append(out, found)
		}
	}
	return out
}

// Get fetches one document.
func (c *Client) Get(ctx context.Context, token, path string, query url.Values) (*Document, error) {
	endpoint := c.baseURL + path
	if len(query) > 0 {
		endpoint += "?" + query.Encode()
	}
	var doc Document
	if err := c.do(ctx, token, http.MethodGet, endpoint, nil, &doc); err != nil {
		return nil, err
	}
	return &doc, nil
}

// GetAll follows pagination up to maxItems primary resources.
func (c *Client) GetAll(ctx context.Context, token, path string, query url.Values, maxItems int) ([]Resource, Included, error) {
	endpoint := c.baseURL + path
	if len(query) > 0 {
		endpoint += "?" + query.Encode()
	}
	var all, included []Resource
	for page := 0; endpoint != "" && page < 50; page++ {
		var doc Document
		if err := c.do(ctx, token, http.MethodGet, endpoint, nil, &doc); err != nil {
			return nil, nil, err
		}
		list, err := doc.Many()
		if err != nil {
			return nil, nil, err
		}
		all = append(all, list...)
		included = append(included, doc.Included...)
		if len(all) >= maxItems {
			break
		}
		endpoint = ""
		if next := doc.Links.Next; next != "" {
			if !strings.HasPrefix(next, c.baseURL+"/") {
				return nil, nil, malformed()
			}
			endpoint = next
		}
	}
	return all, Index(included), nil
}

// Write sends a JSON:API body with POST or PATCH. target may be nil.
func (c *Client) Write(ctx context.Context, token, method, path string, body any, target *Document) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	var out any
	if target != nil {
		out = target
	}
	return c.do(ctx, token, method, c.baseURL+path, payload, out)
}

// Delete issues a DELETE. A body is used for relationship removals.
func (c *Client) Delete(ctx context.Context, token, path string, body any) error {
	var payload []byte
	if body != nil {
		var err error
		if payload, err = json.Marshal(body); err != nil {
			return err
		}
	}
	return c.do(ctx, token, http.MethodDelete, c.baseURL+path, payload, nil)
}

// Download fetches a binary report, such as a gzip Sales report.
func (c *Client) Download(ctx context.Context, token, path string, query url.Values, maxBytes int64) ([]byte, error) {
	endpoint := c.baseURL + path + "?" + query.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, malformed()
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/a-gzip, application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, transportError(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, statusError(resp)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes+1))
	if err != nil || int64(len(body)) > maxBytes {
		return nil, malformed()
	}
	return body, nil
}

func (c *Client) do(ctx context.Context, token, method, endpoint string, payload []byte, target any) error {
	if token == "" || strings.ContainsAny(token, "\r\n\t ") {
		return Errorf(401, "no_credentials", "connect an App Store Connect API key first")
	}
	var body io.Reader
	if payload != nil {
		body = bytes.NewReader(payload)
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return malformed()
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return transportError(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return statusError(resp)
	}
	if target == nil || resp.StatusCode == http.StatusNoContent {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 1<<20))
		return nil
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20+1))
	if err != nil || len(data) > 16<<20 {
		return malformed()
	}
	if err := json.Unmarshal(data, target); err != nil {
		return malformed()
	}
	return nil
}

func malformed() *Error {
	return Errorf(502, "apple_response", "App Store Connect returned a response Fire could not read")
}

func transportError(err error) *Error {
	var timeout interface{ Timeout() bool }
	if errors.Is(err, context.DeadlineExceeded) || (errors.As(err, &timeout) && timeout.Timeout()) {
		return Errorf(504, "apple_timeout", "App Store Connect did not respond in time")
	}
	if errors.Is(err, context.Canceled) {
		return Errorf(499, "canceled", "request canceled")
	}
	return Errorf(502, "apple_unavailable", "could not reach App Store Connect")
}

// statusError maps Apple's status to a sanitized error. For validation
// failures, Apple's own explanation is passed through because it tells the
// user what to fix; it never contains credentials.
func statusError(resp *http.Response) *Error {
	var body struct {
		Errors []struct {
			Code   string `json:"code"`
			Title  string `json:"title"`
			Detail string `json:"detail"`
		} `json:"errors"`
	}
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	_ = json.Unmarshal(raw, &body)
	detail := ""
	if len(body.Errors) > 0 {
		detail = body.Errors[0].Detail
		if detail == "" {
			detail = body.Errors[0].Title
		}
		if len(detail) > 500 {
			detail = detail[:500]
		}
	}
	switch resp.StatusCode {
	case 401:
		return Errorf(401, "apple_authentication", "App Store Connect rejected the API key. Check the key ID, issuer ID and .p8 file")
	case 403:
		return Errorf(403, "apple_permission", "this API key's role cannot do that")
	case 404:
		return Errorf(404, "not_found", "App Store Connect could not find that item")
	case 429:
		e := Errorf(429, "apple_rate_limit", "App Store Connect is rate limiting requests. Try again in a minute")
		e.RetryAfter = resp.Header.Get("Retry-After")
		return e
	case 400, 409, 422:
		if detail == "" {
			detail = "App Store Connect rejected the change"
		}
		return Errorf(resp.StatusCode, "apple_rejected", "%s", detail)
	}
	return Errorf(502, "apple_upstream", "App Store Connect returned an error (%d)", resp.StatusCode)
}
