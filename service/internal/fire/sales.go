package fire

import (
	"context"
	"math"
	"sort"
	"sync"
	"time"

	"fire/service/asc"
)

// Sales is a daily Sales and Trends summary for one app.
type Sales struct {
	From        string           `json:"from"`
	To          string           `json:"to"`
	Days        []SalesDay       `json:"days"`
	Territories []SalesBreakdown `json:"territories"`
	Products    []SalesBreakdown `json:"products"`
	Currencies  []string         `json:"currencies"`
}

// SalesDay totals one day.
type SalesDay struct {
	Date        string             `json:"date"`
	Available   bool               `json:"available"`
	Downloads   float64            `json:"downloads"`
	Redownloads float64            `json:"redownloads"`
	Updates     float64            `json:"updates"`
	Purchases   float64            `json:"purchases"`
	Proceeds    map[string]float64 `json:"proceeds"`
}

// SalesBreakdown totals one territory or product over the range.
type SalesBreakdown struct {
	Key       string             `json:"key"`
	Title     string             `json:"title,omitempty"`
	Kind      string             `json:"kind,omitempty"`
	Downloads float64            `json:"downloads"`
	Purchases float64            `json:"purchases"`
	Units     float64            `json:"units"`
	Proceeds  map[string]float64 `json:"proceeds"`
}

// MaxSalesDays bounds one request, since every day is a separate report.
const MaxSalesDays = 92

// Sales downloads daily reports between from and to (inclusive, YYYY-MM-DD).
// Days whose report is not published yet are marked unavailable.
func (c *Call) Sales(ctx context.Context, appID, vendor, from, to string) (*Sales, error) {
	start, err1 := time.Parse("2006-01-02", from)
	end, err2 := time.Parse("2006-01-02", to)
	if err1 != nil || err2 != nil || end.Before(start) {
		return nil, asc.Errorf(400, "invalid_request", "from and to must be dates, from first")
	}
	if int(end.Sub(start).Hours()/24)+1 > MaxSalesDays {
		return nil, asc.Errorf(400, "invalid_request", "choose %d days or fewer", MaxSalesDays)
	}
	if !asc.VendorPattern.MatchString(vendor) {
		return nil, asc.Errorf(400, "invalid_request", "vendor number must be 6 to 12 digits")
	}
	app, err := c.app(ctx, appID)
	if err != nil {
		return nil, err
	}
	var dates []string
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		dates = append(dates, d.Format("2006-01-02"))
	}
	reports := make([][]asc.SalesRow, len(dates))
	available := make([]bool, len(dates))
	errs := make([]error, len(dates))
	sem := make(chan struct{}, 6)
	var wg sync.WaitGroup
	for i, date := range dates {
		wg.Add(1)
		go func(i int, date string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			rows, err := c.Client.DailySales(ctx, c.Token, vendor, date)
			if asc.IsNotFound(err) {
				return
			}
			reports[i], available[i], errs[i] = rows, err == nil, err
		}(i, date)
	}
	wg.Wait()
	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}
	out := &Sales{From: from, To: to, Days: []SalesDay{}, Territories: []SalesBreakdown{}, Products: []SalesBreakdown{}, Currencies: []string{}}
	territories := map[string]*SalesBreakdown{}
	products := map[string]*SalesBreakdown{}
	currencyTotals := map[string]float64{}
	for i, date := range dates {
		day := SalesDay{Date: date, Available: available[i], Proceeds: map[string]float64{}}
		for _, row := range reports[i] {
			if row.AppleID != appID && (app.SKU == "" || row.ParentID != app.SKU) {
				continue
			}
			kind := asc.SalesKind(row.ProductType)
			proceeds := row.Units * row.DeveloperProceed
			t := territories[row.CountryCode]
			if t == nil {
				t = &SalesBreakdown{Key: row.CountryCode, Proceeds: map[string]float64{}}
				territories[row.CountryCode] = t
			}
			p := products[row.AppleID]
			if p == nil {
				p = &SalesBreakdown{Key: row.AppleID, Title: row.Title, Kind: kind, Proceeds: map[string]float64{}}
				products[row.AppleID] = p
			}
			switch kind {
			case "download":
				day.Downloads += row.Units
				t.Downloads += row.Units
			case "redownload":
				day.Redownloads += row.Units
			case "update":
				day.Updates += row.Units
			case "purchase":
				day.Purchases += row.Units
				t.Purchases += row.Units
			}
			if kind != "update" {
				p.Units += row.Units
			}
			if proceeds != 0 && row.ProceedsCurrency != "" {
				day.Proceeds[row.ProceedsCurrency] += proceeds
				t.Proceeds[row.ProceedsCurrency] += proceeds
				p.Proceeds[row.ProceedsCurrency] += proceeds
				// Currencies can't be compared by amount, so rank them by the units that earned them.
				currencyTotals[row.ProceedsCurrency] += row.Units
			}
		}
		roundMoney(day.Proceeds)
		out.Days = append(out.Days, day)
	}
	for _, t := range territories {
		roundMoney(t.Proceeds)
		out.Territories = append(out.Territories, *t)
	}
	sort.SliceStable(out.Territories, func(i, j int) bool {
		return out.Territories[i].Downloads+out.Territories[i].Purchases > out.Territories[j].Downloads+out.Territories[j].Purchases
	})
	for _, p := range products {
		roundMoney(p.Proceeds)
		out.Products = append(out.Products, *p)
	}
	sort.SliceStable(out.Products, func(i, j int) bool { return out.Products[i].Units > out.Products[j].Units })
	for cur := range currencyTotals {
		out.Currencies = append(out.Currencies, cur)
	}
	sort.SliceStable(out.Currencies, func(i, j int) bool { return currencyTotals[out.Currencies[i]] > currencyTotals[out.Currencies[j]] })
	return out, nil
}

// roundMoney rounds amounts to cents, hiding float noise from summing many rows.
func roundMoney(amounts map[string]float64) {
	for currency, value := range amounts {
		amounts[currency] = math.Round(value*100) / 100
	}
}
