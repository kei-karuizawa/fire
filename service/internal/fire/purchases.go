package fire

import (
	"context"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"fire/service/asc"
)

// Product is an in-app purchase or a subscription.
type Product struct {
	ID             string `json:"id"`
	Kind           string `json:"kind"` // "iap" or "subscription"
	Name           string `json:"name"`
	ProductID      string `json:"productId"`
	Type           string `json:"type"` // CONSUMABLE, NON_CONSUMABLE, NON_RENEWING_SUBSCRIPTION, AUTO_RENEWABLE
	State          string `json:"state"`
	Period         string `json:"period,omitempty"`
	GroupID        string `json:"groupId,omitempty"`
	GroupLevel     int    `json:"groupLevel,omitempty"`
	FamilySharable bool   `json:"familySharable"`
	ReviewNote     string `json:"reviewNote"`
}

// SubscriptionGroup groups auto-renewable subscriptions.
type SubscriptionGroup struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Products []Product `json:"products"`
}

// Purchases is the In-App Purchases page document.
type Purchases struct {
	Groups  []SubscriptionGroup `json:"groups"`
	OneTime []Product           `json:"oneTime"`
}

func subscriptionFrom(r *asc.Resource, groupID string) Product {
	return Product{
		ID: r.ID, Kind: "subscription", Name: r.Str("name"), ProductID: r.Str("productId"), Type: "AUTO_RENEWABLE",
		State: r.Str("state"), Period: r.Str("subscriptionPeriod"), GroupID: groupID, GroupLevel: r.Int("groupLevel"),
		FamilySharable: r.Bool("familySharable"), ReviewNote: r.Str("reviewNote"),
	}
}

func iapFrom(r *asc.Resource) Product {
	return Product{
		ID: r.ID, Kind: "iap", Name: r.Str("name"), ProductID: r.Str("productId"), Type: r.Str("inAppPurchaseType"),
		State: r.Str("state"), FamilySharable: r.Bool("familySharable"), ReviewNote: r.Str("reviewNote"),
	}
}

// Purchases lists subscription groups and one-time purchases.
func (c *Call) Purchases(ctx context.Context, appID string) (*Purchases, error) {
	out := &Purchases{Groups: []SubscriptionGroup{}, OneTime: []Product{}}
	err := parallel(
		func() error {
			groups, inc, err := c.all(ctx, "/v1/apps/"+appID+"/subscriptionGroups", q("include", "subscriptions", "limit", "50", "limit[subscriptions]", "50"), 200)
			if err != nil {
				return err
			}
			for i := range groups {
				g := SubscriptionGroup{ID: groups[i].ID, Name: groups[i].Str("referenceName"), Products: []Product{}}
				for _, s := range inc.FollowMany(&groups[i], "subscriptions") {
					g.Products = append(g.Products, subscriptionFrom(s, g.ID))
				}
				sort.SliceStable(g.Products, func(a, b int) bool { return g.Products[a].GroupLevel < g.Products[b].GroupLevel })
				out.Groups = append(out.Groups, g)
			}
			return nil
		},
		func() error {
			list, _, err := c.all(ctx, "/v1/apps/"+appID+"/inAppPurchasesV2", q("limit", "200"), 1000)
			if err != nil {
				return err
			}
			for i := range list {
				out.OneTime = append(out.OneTime, iapFrom(&list[i]))
			}
			sort.SliceStable(out.OneTime, func(a, b int) bool {
				return strings.ToLower(out.OneTime[a].Name) < strings.ToLower(out.OneTime[b].Name)
			})
			return nil
		},
	)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// ProductDetail is one product with localizations and prices.
type ProductDetail struct {
	Product       Product               `json:"product"`
	Localizations []ProductLocalization `json:"localizations"`
	Prices        []Price               `json:"prices"`
}

// ProductLocalization is a product's display name and description in one locale.
type ProductLocalization struct {
	ID          string `json:"id"`
	Locale      string `json:"locale"`
	Name        string `json:"name"`
	Description string `json:"description"`
	State       string `json:"state"`
}

// Price is the price in one territory.
type Price struct {
	Territory     string `json:"territory"`
	Currency      string `json:"currency"`
	CustomerPrice string `json:"customerPrice"`
	Proceeds      string `json:"proceeds"`
	StartDate     string `json:"startDate,omitempty"`
	Scheduled     bool   `json:"scheduled"`
	Manual        bool   `json:"manual"`
}

// FeaturedTerritories are the storefronts Fire shows prices for.
var FeaturedTerritories = []string{"USA", "CHN", "JPN", "TWN", "HKG", "GBR", "DEU", "FRA", "CAN", "AUS"}

func productPaths(kind, id string) (resource, resourceType, localizations, localizationType, relation string, err error) {
	switch kind {
	case "iap":
		return "/v2/inAppPurchases/" + id, "inAppPurchases", "/v2/inAppPurchases/" + id + "/inAppPurchaseLocalizations", "inAppPurchaseLocalizations", "inAppPurchaseV2", nil
	case "subscription":
		return "/v1/subscriptions/" + id, "subscriptions", "/v1/subscriptions/" + id + "/subscriptionLocalizations", "subscriptionLocalizations", "subscription", nil
	}
	return "", "", "", "", "", asc.Errorf(400, "invalid_request", "kind must be iap or subscription")
}

// Product loads one product.
func (c *Call) Product(ctx context.Context, kind, id string) (*ProductDetail, error) {
	resource, _, locPath, _, _, err := productPaths(kind, id)
	if err != nil {
		return nil, err
	}
	d := &ProductDetail{Localizations: []ProductLocalization{}, Prices: []Price{}}
	err = parallel(
		func() error {
			doc, err := c.get(ctx, resource, nil)
			if err != nil {
				return err
			}
			r, err := doc.One()
			if err != nil {
				return err
			}
			if kind == "iap" {
				d.Product = iapFrom(&r)
			} else {
				d.Product = subscriptionFrom(&r, r.Rel("group"))
			}
			return nil
		},
		func() error {
			list, _, err := c.all(ctx, locPath, q("limit", "50"), 200)
			if err != nil {
				return err
			}
			for i := range list {
				l := &list[i]
				d.Localizations = append(d.Localizations, ProductLocalization{ID: l.ID, Locale: l.Str("locale"), Name: l.Str("name"), Description: l.Str("description"), State: l.Str("state")})
			}
			sortLocales(d.Localizations, "en-US", func(l ProductLocalization) string { return l.Locale })
			return nil
		},
		func() error {
			prices, err := c.prices(ctx, kind, id)
			if err == nil {
				d.Prices = prices
			}
			// Prices are informative; a role without pricing access still sees the rest.
			return nil
		},
	)
	if err != nil {
		return nil, err
	}
	return d, nil
}

func (c *Call) prices(ctx context.Context, kind, id string) ([]Price, error) {
	territories := strings.Join(FeaturedTerritories, ",")
	type source struct {
		path, pointRel string
		manual         bool
	}
	var sources []source
	if kind == "iap" {
		sources = []source{
			{"/v1/inAppPurchasePriceSchedules/" + id + "/manualPrices", "inAppPurchasePricePoint", true},
			{"/v1/inAppPurchasePriceSchedules/" + id + "/automaticPrices", "inAppPurchasePricePoint", false},
		}
	} else {
		sources = []source{{"/v1/subscriptions/" + id + "/prices", "subscriptionPricePoint", true}}
	}
	today := time.Now().UTC().Format("2006-01-02")
	current := map[string]Price{}
	var scheduled []Price
	for _, src := range sources {
		list, inc, err := c.all(ctx, src.path, q("include", src.pointRel+",territory", "filter[territory]", territories, "limit", "200"), 400)
		if err != nil {
			return nil, err
		}
		for i := range list {
			r := &list[i]
			p := Price{StartDate: r.Str("startDate"), Manual: src.manual}
			if point := inc.Follow(r, src.pointRel); point != nil {
				p.CustomerPrice, p.Proceeds = point.Str("customerPrice"), point.Str("proceeds")
			}
			territoryID := r.Rel("territory")
			if t := inc.Follow(r, "territory"); t != nil {
				p.Currency = t.Str("currency")
			}
			p.Territory = territoryID
			if end := r.Str("endDate"); end != "" && end <= today {
				continue
			}
			if p.StartDate > today {
				p.Scheduled = true
				scheduled = append(scheduled, p)
				continue
			}
			if prev, ok := current[territoryID]; !ok || p.StartDate >= prev.StartDate || (p.Manual && !prev.Manual) {
				current[territoryID] = p
			}
		}
	}
	out := []Price{}
	for _, t := range FeaturedTerritories {
		if p, ok := current[t]; ok {
			out = append(out, p)
		}
	}
	sort.SliceStable(scheduled, func(i, j int) bool { return scheduled[i].StartDate < scheduled[j].StartDate })
	return append(out, scheduled...), nil
}

// ProductChange edits a product's review note or Family Sharing.
type ProductChange struct {
	ReviewNote     *string `json:"reviewNote"`
	FamilySharable *bool   `json:"familySharable"`
}

// UpdateProduct saves product attributes.
func (c *Call) UpdateProduct(ctx context.Context, kind, id string, ch ProductChange) (*ProductDetail, error) {
	resource, resourceType, _, _, _, err := productPaths(kind, id)
	if err != nil {
		return nil, err
	}
	attrs := map[string]any{}
	if ch.ReviewNote != nil {
		if utf8.RuneCountInString(*ch.ReviewNote) > 4000 {
			return nil, asc.Errorf(400, "invalid_request", "review notes are longer than 4,000 characters")
		}
		attrs["reviewNote"] = *ch.ReviewNote
	}
	if ch.FamilySharable != nil {
		attrs["familySharable"] = *ch.FamilySharable
	}
	if len(attrs) > 0 {
		if err := c.patch(ctx, resource, resourceType, id, attrs, nil); err != nil {
			return nil, err
		}
	}
	return c.Product(ctx, kind, id)
}

// LocalizationInput is a product localization's text.
type LocalizationInput struct {
	Locale      string `json:"locale"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

func (in LocalizationInput) validate() error {
	if strings.TrimSpace(in.Name) == "" {
		return asc.Errorf(400, "invalid_request", "a display name is required")
	}
	if utf8.RuneCountInString(in.Name) > 30 || utf8.RuneCountInString(in.Description) > 45 {
		return asc.Errorf(400, "invalid_request", "display names are up to 30 characters and descriptions up to 45")
	}
	return nil
}

// AddProductLocalization creates a localization.
func (c *Call) AddProductLocalization(ctx context.Context, kind, id string, in LocalizationInput) (*ProductDetail, error) {
	_, resourceType, _, locType, relation, err := productPaths(kind, id)
	if err != nil {
		return nil, err
	}
	if !localePattern(in.Locale) {
		return nil, asc.Errorf(400, "invalid_request", "invalid locale")
	}
	if err := in.validate(); err != nil {
		return nil, err
	}
	attrs := map[string]any{"locale": in.Locale, "name": in.Name}
	if in.Description != "" {
		attrs["description"] = in.Description
	}
	if _, err := c.create(ctx, "/v1/"+locType, locType, attrs, map[string]any{relation: one(resourceType, id)}); err != nil {
		return nil, err
	}
	return c.Product(ctx, kind, id)
}

// UpdateProductLocalization edits a localization's name and description.
func (c *Call) UpdateProductLocalization(ctx context.Context, kind, id, locID string, in LocalizationInput) (*ProductDetail, error) {
	_, _, _, locType, _, err := productPaths(kind, id)
	if err != nil {
		return nil, err
	}
	if err := in.validate(); err != nil {
		return nil, err
	}
	if err := c.ownsLocalization(ctx, kind, id, locID); err != nil {
		return nil, err
	}
	if err := c.patch(ctx, "/v1/"+locType+"/"+locID, locType, locID, map[string]any{"name": in.Name, "description": in.Description}, nil); err != nil {
		return nil, err
	}
	return c.Product(ctx, kind, id)
}

// DeleteProductLocalization removes a localization.
func (c *Call) DeleteProductLocalization(ctx context.Context, kind, id, locID string) (*ProductDetail, error) {
	_, _, _, locType, _, err := productPaths(kind, id)
	if err != nil {
		return nil, err
	}
	if err := c.ownsLocalization(ctx, kind, id, locID); err != nil {
		return nil, err
	}
	if err := c.Client.Delete(ctx, c.Token, "/v1/"+locType+"/"+locID, nil); err != nil {
		return nil, err
	}
	return c.Product(ctx, kind, id)
}

func (c *Call) ownsLocalization(ctx context.Context, kind, id, locID string) error {
	_, _, locPath, _, _, _ := productPaths(kind, id)
	list, _, err := c.all(ctx, locPath, q("limit", "50"), 200)
	if err != nil {
		return err
	}
	for _, l := range list {
		if l.ID == locID {
			return nil
		}
	}
	return asc.Errorf(404, "not_found", "that localization does not belong to this product")
}
