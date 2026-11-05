// Package mockapple is an in-memory stand-in for the App Store Connect API.
// It serves synthetic data in Apple's JSON:API shapes so Fire can be developed,
// demonstrated and tested without real credentials. It is not a full
// implementation: it covers the endpoints Fire uses.
package mockapple

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type ref struct {
	Type string `json:"type"`
	ID   string `json:"id"`
}

type rel struct {
	many  bool
	refs  []ref
	total int // for synthetic to-many relationships whose members are not stored
}

type resource struct {
	Type  string
	ID    string
	Attrs map[string]any
	Rels  map[string]*rel
}

// Server is the mock API.
type Server struct {
	mu      sync.Mutex
	byKey   map[string]*resource
	order   []string
	nextID  int
	now     time.Time
	baseURL string
	path    string
}

// reverse links: when a child is created with relationship name, the parent's
// relationship gains the child.
var reverse = map[string]string{
	"appInfoLocalizations.appInfo":                 "appInfoLocalizations",
	"appStoreVersionLocalizations.appStoreVersion": "appStoreVersionLocalizations",
	"appStoreReviewDetails.appStoreVersion":        "appStoreReviewDetail",
	"betaBuildLocalizations.build":                 "betaBuildLocalizations",
	"inAppPurchaseLocalizations.inAppPurchaseV2":   "inAppPurchaseLocalizations",
	"subscriptionLocalizations.subscription":       "subscriptionLocalizations",
	"betaTesters.betaGroups":                       "betaTesters",
	"reviewSubmissions.app":                        "reviewSubmissions",
	"reviewSubmissionItems.reviewSubmission":       "items",
}

// pathTypes maps URL collection names to resource types where they differ.
var pathTypes = map[string]string{
	"inAppPurchasesV2":         "inAppPurchases",
	"appStoreReviewDetail":     "appStoreReviewDetails",
	"prices":                   "subscriptionPrices",
	"manualPrices":             "inAppPurchasePrices",
	"automaticPrices":          "inAppPurchasePrices",
	"items":                    "reviewSubmissionItems",
	"appStoreVersionForReview": "appStoreVersions",
	"submittedByActor":         "actors",
}

func k(kind, id string) string { return kind + "/" + id }

func (s *Server) put(r *resource) *resource {
	if r.Attrs == nil {
		r.Attrs = map[string]any{}
	}
	if r.Rels == nil {
		r.Rels = map[string]*rel{}
	}
	key := k(r.Type, r.ID)
	if _, ok := s.byKey[key]; !ok {
		s.order = append(s.order, key)
	}
	s.byKey[key] = r
	return r
}

func (s *Server) get(kind, id string) *resource { return s.byKey[k(kind, id)] }

func (s *Server) link(from *resource, name string, to *resource) {
	r := from.Rels[name]
	if r == nil {
		r = &rel{}
		from.Rels[name] = r
	}
	r.refs = append(r.refs, ref{to.Type, to.ID})
}

func (s *Server) one(from *resource, name string, to *resource) {
	from.Rels[name] = &rel{refs: []ref{{to.Type, to.ID}}}
}

func (s *Server) many(from *resource, name string) {
	if from.Rels[name] == nil {
		from.Rels[name] = &rel{many: true}
	}
	from.Rels[name].many = true
}

func (s *Server) id() string {
	s.nextID++
	return strconv.Itoa(6400000000 + s.nextID)
}

// New returns a mock with seeded data.
func New() *Server {
	s := &Server{byKey: map[string]*resource{}, now: time.Now().UTC()}
	s.seed()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	token := strings.TrimPrefix(auth, "Bearer ")
	if token == auth || !validJWT(token) {
		apiError(w, 401, "NOT_AUTHORIZED", "Authentication credentials are missing or invalid.")
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.baseURL == "" {
		s.baseURL = "http://" + r.Host
	}
	s.path = r.URL.Path
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 2 || (parts[0] != "v1" && parts[0] != "v2") {
		apiError(w, 404, "NOT_FOUND", "The path provided does not match a defined resource type.")
		return
	}
	parts = parts[1:]
	query := r.URL.Query()
	switch {
	case parts[0] == "salesReports" && r.Method == http.MethodGet:
		s.sales(w, query)
	case len(parts) == 4 && parts[2] == "metrics" && parts[3] == "betaBuildUsages":
		s.usage(w, parts[1])
	case len(parts) == 4 && parts[2] == "relationships":
		s.relationships(w, r, parts)
	case r.Method == http.MethodGet && len(parts) == 1:
		s.list(w, s.collection(parts[0]), query)
	case r.Method == http.MethodGet && len(parts) == 2:
		res := s.get(s.typeOf(parts[0]), parts[1])
		if res == nil {
			apiError(w, 404, "NOT_FOUND", "There is no resource of that type with this id.")
			return
		}
		s.single(w, res, query)
	case r.Method == http.MethodGet && len(parts) == 3:
		s.related(w, parts, query)
	case r.Method == http.MethodPatch && len(parts) == 2:
		s.patch(w, r, parts)
	case r.Method == http.MethodPost && len(parts) == 1:
		s.create(w, r, parts[0])
	case r.Method == http.MethodDelete && len(parts) == 2:
		key := k(s.typeOf(parts[0]), parts[1])
		if s.byKey[key] == nil {
			apiError(w, 404, "NOT_FOUND", "There is no resource of that type with this id.")
			return
		}
		delete(s.byKey, key)
		w.WriteHeader(http.StatusNoContent)
	default:
		apiError(w, 404, "NOT_FOUND", "The path provided does not match a defined resource type.")
	}
}

func validJWT(token string) bool {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return false
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return false
	}
	var header struct {
		Alg string `json:"alg"`
		Kid string `json:"kid"`
	}
	return json.Unmarshal(raw, &header) == nil && header.Alg == "ES256" && header.Kid != ""
}

func (s *Server) typeOf(name string) string {
	if t, ok := pathTypes[name]; ok {
		return t
	}
	return name
}

func (s *Server) collection(kind string) []*resource {
	kind = s.typeOf(kind)
	var out []*resource
	for _, key := range s.order {
		if r := s.byKey[key]; r != nil && r.Type == kind {
			out = append(out, r)
		}
	}
	return out
}

func (s *Server) related(w http.ResponseWriter, parts []string, query url.Values) {
	parent := s.get(s.typeOf(parts[0]), parts[1])
	if parent == nil {
		apiError(w, 404, "NOT_FOUND", "There is no resource of that type with this id.")
		return
	}
	name := parts[2]
	r := parent.Rels[name]
	if r == nil {
		if strings.HasSuffix(name, "s") {
			s.list(w, nil, query)
			return
		}
		apiError(w, 404, "NOT_FOUND", "There is no related resource.")
		return
	}
	var list []*resource
	for _, ref := range r.refs {
		if res := s.get(ref.Type, ref.ID); res != nil {
			list = append(list, res)
		}
	}
	if !r.many && len(r.refs) <= 1 && !strings.HasSuffix(name, "s") {
		if len(list) == 0 {
			apiError(w, 404, "NOT_FOUND", "There is no related resource.")
			return
		}
		s.single(w, list[0], query)
		return
	}
	s.list(w, list, query)
}

func (s *Server) matches(r *resource, field, value string) bool {
	wanted := strings.Split(value, ",")
	has := func(v string) bool {
		for _, w := range wanted {
			if w == v {
				return true
			}
		}
		return false
	}
	if head, tail, dotted := strings.Cut(field, "."); dotted {
		rl := r.Rels[head]
		if rl == nil {
			return false
		}
		for _, ref := range rl.refs {
			if target := s.get(ref.Type, ref.ID); target != nil && s.matches(target, tail, value) {
				return true
			}
		}
		return false
	}
	if rl, ok := r.Rels[field]; ok {
		for _, ref := range rl.refs {
			if has(ref.ID) {
				return true
			}
		}
		return false
	}
	switch v := r.Attrs[field].(type) {
	case string:
		return has(v)
	case []string:
		for _, item := range v {
			if has(item) {
				return true
			}
		}
	}
	return false
}

func (s *Server) list(w http.ResponseWriter, list []*resource, query url.Values) {
	filtered := []*resource{}
	for _, r := range list {
		ok := true
		for key, values := range query {
			if strings.HasPrefix(key, "filter[") {
				if !s.matches(r, strings.TrimSuffix(strings.TrimPrefix(key, "filter["), "]"), values[0]) {
					ok = false
				}
			}
			if strings.HasPrefix(key, "exists[") && values[0] == "false" {
				name := strings.TrimSuffix(strings.TrimPrefix(key, "exists["), "]")
				if rl := r.Rels[name]; rl != nil && len(rl.refs) > 0 {
					ok = false
				}
			}
		}
		if ok {
			filtered = append(filtered, r)
		}
	}
	if sortKey := query.Get("sort"); sortKey != "" {
		desc := strings.HasPrefix(sortKey, "-")
		field := strings.TrimPrefix(sortKey, "-")
		sort.SliceStable(filtered, func(i, j int) bool {
			a, _ := filtered[i].Attrs[field].(string)
			b, _ := filtered[j].Attrs[field].(string)
			if desc {
				return a > b
			}
			return a < b
		})
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	offset, _ := strconv.Atoi(query.Get("cursor"))
	total := len(filtered)
	end := min(offset+limit, total)
	if offset > total {
		offset = total
	}
	page := filtered[offset:end]
	doc := map[string]any{"data": s.render(page, query), "meta": map[string]any{"paging": map[string]int{"total": total, "limit": limit}}}
	doc["included"] = s.included(page, query)
	links := map[string]string{}
	if end < total {
		next := url.Values{}
		for key, values := range query {
			next[key] = values
		}
		next.Set("cursor", strconv.Itoa(end))
		links["next"] = s.baseURL + s.path + "?" + next.Encode()
	}
	doc["links"] = links
	writeDoc(w, 200, doc)
}

func (s *Server) single(w http.ResponseWriter, r *resource, query url.Values) {
	doc := map[string]any{"data": s.render([]*resource{r}, query)[0], "included": s.included([]*resource{r}, query), "links": map[string]string{}}
	writeDoc(w, 200, doc)
}

func writeDoc(w http.ResponseWriter, status int, doc map[string]any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(doc)
}

func (s *Server) render(list []*resource, query url.Values) []map[string]any {
	out := []map[string]any{}
	for _, r := range list {
		rels := map[string]any{}
		for name, rl := range r.Rels {
			entry := map[string]any{}
			limit, _ := strconv.Atoi(query.Get("limit[" + name + "]"))
			if rl.many || len(rl.refs) != 1 || strings.HasSuffix(name, "s") {
				refs := rl.refs
				if limit > 0 && len(refs) > limit {
					refs = refs[:limit]
				}
				if refs == nil {
					refs = []ref{}
				}
				entry["data"] = refs
				total := len(rl.refs)
				if rl.total > total {
					total = rl.total
				}
				entry["meta"] = map[string]any{"paging": map[string]int{"total": total, "limit": max(limit, 1)}}
			} else {
				entry["data"] = rl.refs[0]
			}
			rels[name] = entry
		}
		out = append(out, map[string]any{"type": r.Type, "id": r.ID, "attributes": r.Attrs, "relationships": rels})
	}
	return out
}

func (s *Server) included(list []*resource, query url.Values) []map[string]any {
	names := strings.Split(query.Get("include"), ",")
	seen := map[string]bool{}
	var out []*resource
	for _, r := range list {
		for _, name := range names {
			rl := r.Rels[name]
			if rl == nil {
				continue
			}
			for _, ref := range rl.refs {
				key := k(ref.Type, ref.ID)
				if res := s.byKey[key]; res != nil && !seen[key] {
					seen[key] = true
					out = append(out, res)
				}
			}
		}
	}
	return s.render(out, url.Values{})
}

type body struct {
	Data struct {
		Type          string                     `json:"type"`
		ID            string                     `json:"id"`
		Attributes    map[string]any             `json:"attributes"`
		Relationships map[string]json.RawMessage `json:"relationships"`
	} `json:"data"`
}

func refsOf(raw json.RawMessage) ([]ref, bool) {
	var wrapper struct {
		Data json.RawMessage `json:"data"`
	}
	if json.Unmarshal(raw, &wrapper) != nil {
		return nil, false
	}
	if string(wrapper.Data) == "null" {
		return nil, true
	}
	var one ref
	if json.Unmarshal(wrapper.Data, &one) == nil && one.ID != "" {
		return []ref{one}, true
	}
	var many []ref
	if json.Unmarshal(wrapper.Data, &many) == nil {
		return many, true
	}
	return nil, false
}

func (s *Server) patch(w http.ResponseWriter, r *http.Request, parts []string) {
	var b body
	if json.NewDecoder(r.Body).Decode(&b) != nil {
		apiError(w, 400, "PARAMETER_ERROR.INVALID", "The request body is invalid.")
		return
	}
	res := s.get(s.typeOf(parts[0]), parts[1])
	if res == nil || b.Data.ID != parts[1] || b.Data.Type != res.Type {
		apiError(w, 409, "ENTITY_ERROR", "The resource type or id in the body does not match the URL.")
		return
	}
	if res.Type == "appStoreVersionLocalizations" {
		if v, ok := b.Data.Attributes["keywords"].(string); ok && len([]rune(v)) > 100 {
			apiError(w, 409, "ENTITY_ERROR.ATTRIBUTE.INVALID.TOO_LONG", "The keywords may not be longer than 100 characters.")
			return
		}
	}
	for name, value := range b.Data.Attributes {
		if name == "canceled" && value == true {
			res.Attrs["state"] = "CANCELING"
			continue
		}
		if name == "submitted" && value == true {
			res.Attrs["state"] = "WAITING_FOR_REVIEW"
			res.Attrs["submittedDate"] = s.now.Format(time.RFC3339)
			continue
		}
		res.Attrs[name] = value
	}
	for name, raw := range b.Data.Relationships {
		refs, ok := refsOf(raw)
		if !ok {
			continue
		}
		res.Rels[name] = &rel{refs: refs}
	}
	s.single(w, res, url.Values{})
}

func (s *Server) create(w http.ResponseWriter, r *http.Request, collection string) {
	var b body
	if json.NewDecoder(r.Body).Decode(&b) != nil {
		apiError(w, 400, "PARAMETER_ERROR.INVALID", "The request body is invalid.")
		return
	}
	kind := s.typeOf(collection)
	if b.Data.Type != kind {
		apiError(w, 409, "ENTITY_ERROR", "The resource type in the body does not match the URL.")
		return
	}
	res := s.put(&resource{Type: kind, ID: s.id(), Attrs: b.Data.Attributes})
	for name, raw := range b.Data.Relationships {
		refs, _ := refsOf(raw)
		res.Rels[name] = &rel{refs: refs, many: len(refs) != 1}
		if back, ok := reverse[kind+"."+name]; ok {
			for _, ref := range refs {
				if parent := s.get(s.typeOf(ref.Type), ref.ID); parent != nil {
					if back == "appStoreReviewDetail" {
						s.one(parent, back, res)
					} else {
						s.link(parent, back, res)
					}
				}
			}
		}
	}
	switch kind {
	case "betaAppReviewSubmissions":
		if build := s.get("builds", res.Rels["build"].refs[0].ID); build != nil {
			if detail := s.get("buildBetaDetails", build.ID); detail != nil {
				detail.Attrs["externalBuildState"] = "WAITING_FOR_BETA_REVIEW"
			}
		}
	case "userInvitations":
		res.Attrs["expirationDate"] = s.now.AddDate(0, 0, 30).Format(time.RFC3339)
	case "reviewSubmissions":
		res.Attrs["state"] = "READY_FOR_REVIEW"
	case "reviewSubmissionItems":
		res.Attrs["state"] = "READY_FOR_REVIEW"
	case "appInfoLocalizations", "appStoreVersionLocalizations", "inAppPurchaseLocalizations", "subscriptionLocalizations":
		res.Attrs["state"] = "PREPARE_FOR_SUBMISSION"
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(201)
	_ = json.NewEncoder(w).Encode(map[string]any{"data": s.render([]*resource{res}, url.Values{})[0]})
}

func (s *Server) relationships(w http.ResponseWriter, r *http.Request, parts []string) {
	parent := s.get(s.typeOf(parts[0]), parts[1])
	if parent == nil {
		apiError(w, 404, "NOT_FOUND", "There is no resource of that type with this id.")
		return
	}
	var b struct {
		Data []ref `json:"data"`
	}
	if json.NewDecoder(r.Body).Decode(&b) != nil {
		apiError(w, 400, "PARAMETER_ERROR.INVALID", "The request body is invalid.")
		return
	}
	name := parts[3]
	for _, ref := range b.Data {
		target := s.get(ref.Type, ref.ID)
		if target == nil {
			apiError(w, 404, "NOT_FOUND", "A related resource does not exist.")
			return
		}
		back := map[string]string{"builds": "betaGroups"}[name]
		switch r.Method {
		case http.MethodPost:
			s.link(parent, name, target)
			if back != "" {
				s.link(target, back, parent)
			}
		case http.MethodDelete:
			unlink(parent, name, ref.ID)
			if back != "" {
				unlink(target, back, parent.ID)
			}
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func unlink(r *resource, name, id string) {
	rl := r.Rels[name]
	if rl == nil {
		return
	}
	kept := rl.refs[:0]
	for _, ref := range rl.refs {
		if ref.ID != id {
			kept = append(kept, ref)
		}
	}
	rl.refs = kept
}

func apiError(w http.ResponseWriter, status int, code, detail string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"errors": []map[string]string{{"status": strconv.Itoa(status), "code": code, "title": "Error", "detail": detail}}})
}

func (s *Server) usage(w http.ResponseWriter, buildID string) {
	build := s.get("builds", buildID)
	if build == nil {
		apiError(w, 404, "NOT_FOUND", "There is no resource of that type with this id.")
		return
	}
	n, _ := strconv.Atoi(build.Attrs["version"].(string))
	installs := n * 7 % 1300
	if build.Attrs["processingState"] == "PROCESSING" {
		installs = 0
	}
	values := map[string]int{"installCount": installs, "sessionCount": installs * 8, "crashCount": installs / 50, "feedbackCount": installs / 400, "inviteCount": installs + 110}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"data": []any{map[string]any{"dataPoints": []any{map[string]any{"values": values}}}}})
}

// sales returns a deterministic synthetic daily report as gzip TSV.
func (s *Server) sales(w http.ResponseWriter, query url.Values) {
	date, err := time.Parse("2006-01-02", query.Get("filter[reportDate]"))
	if err != nil || query.Get("filter[vendorNumber]") == "" {
		apiError(w, 400, "PARAMETER_ERROR.INVALID", "A valid reportDate and vendorNumber are required.")
		return
	}
	today := s.now.Truncate(24 * time.Hour)
	if !date.Before(today.AddDate(0, 0, -1)) || date.Before(today.AddDate(-1, 0, 0)) {
		apiError(w, 404, "NOT_FOUND", "There were no sales for the date specified.")
		return
	}
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	header := []string{"Provider", "Provider Country", "SKU", "Developer", "Title", "Version", "Product Type Identifier", "Units", "Developer Proceeds", "Begin Date", "End Date", "Customer Currency", "Country Code", "Currency of Proceeds", "Apple Identifier", "Customer Price", "Promo Code", "Parent Identifier", "Subscription", "Period", "Category", "CMB", "Device", "Supported Platforms", "Proceeds Reason", "Preserved Pricing", "Client", "Order Type"}
	fmt.Fprintln(gz, strings.Join(header, "\t"))
	day := int(date.Unix() / 86400)
	wave := func(seed, base int) int {
		weekly := []int{100, 92, 95, 97, 104, 126, 131}[date.Weekday()]
		v := base * weekly / 100
		v += (day*seed*7919 + seed*104729) % (base/4 + 1)
		if spike := today.AddDate(0, 0, -24); date.After(spike.AddDate(0, 0, -4)) && date.Before(spike.AddDate(0, 0, 3)) {
			v = v * 2
		}
		return v
	}
	d := date.Format("01/02/2006")
	type market struct {
		code, currency string
		share          int
		price, proceed float64
	}
	markets := []market{{"US", "USD", 38, 4.99, 4.24}, {"CN", "CNY", 22, 30, 25.5}, {"JP", "JPY", 14, 800, 680}, {"GB", "GBP", 7, 4.99, 4.24}, {"DE", "EUR", 7, 5.99, 5.09}, {"TW", "TWD", 5, 170, 144.5}, {"CA", "CAD", 4, 6.99, 5.94}, {"AU", "AUD", 3, 7.99, 6.79}}
	for _, app := range s.collection("apps") {
		sku, _ := app.Attrs["sku"].(string)
		name, _ := app.Attrs["name"].(string)
		scale := 1
		if sku != "EMBER001" {
			scale = 4
		}
		for i, m := range markets {
			row := func(title, kind string, units int, proceeds, price float64, appleID, parent string) {
				if units <= 0 {
					return
				}
				fmt.Fprintln(gz, strings.Join([]string{"APPLE", "US", sku, "Acme Studio", title, "3.2.0", kind, strconv.Itoa(units), strconv.FormatFloat(proceeds, 'f', 2, 64), d, d, m.currency, m.code, m.currency, appleID, strconv.FormatFloat(price, 'f', 2, 64), "", parent, "", "", "Productivity", "", "iPhone", "iOS", "", "", "", ""}, "\t"))
			}
			downloads := wave(i+3, 1900/scale) * m.share / 100
			row(name, "1F", downloads, 0, 0, app.ID, "")
			row(name, "3F", downloads/6, 0, 0, app.ID, "")
			row(name, "7F", downloads*4, 0, 0, app.ID, "")
			if scale == 1 {
				row("Ember Pro Monthly", "IAY", downloads/30, m.proceed, m.price, "6502918842", sku)
				row("Ember Pro Lifetime", "IA1", downloads/90, m.proceed*16, m.price*16, "6502918850", sku)
			}
		}
	}
	gz.Close()
	w.Header().Set("Content-Type", "application/a-gzip")
	_, _ = io.Copy(w, &buf)
}
