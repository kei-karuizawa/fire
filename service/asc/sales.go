package asc

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/csv"
	"errors"
	"io"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

// VendorPattern matches a Sales and Trends vendor number.
var VendorPattern = regexp.MustCompile(`^[0-9]{6,12}$`)

// SalesRow is one line of a SALES/SUMMARY report.
type SalesRow struct {
	SKU              string
	Title            string
	ProductType      string
	Units            float64
	DeveloperProceed float64 // per unit
	ProceedsCurrency string
	CountryCode      string
	AppleID          string
	ParentID         string
}

// DailySales downloads and parses the daily summary sales report for date
// (YYYY-MM-DD). A missing report returns IsNotFound.
func (c *Client) DailySales(ctx context.Context, token, vendor, date string) ([]SalesRow, error) {
	if !VendorPattern.MatchString(vendor) {
		return nil, Errorf(400, "invalid_request", "vendor number must be 6 to 12 digits")
	}
	query := url.Values{
		"filter[frequency]":     {"DAILY"},
		"filter[reportDate]":    {date},
		"filter[reportSubType]": {"SUMMARY"},
		"filter[reportType]":    {"SALES"},
		"filter[vendorNumber]":  {vendor},
		"filter[version]":       {"1_0"},
	}
	data, err := c.Download(ctx, token, "/v1/salesReports", query, 32<<20)
	if err != nil {
		return nil, err
	}
	return ParseSales(data)
}

// ParseSales reads a gzip or plain tab-separated sales report.
func ParseSales(data []byte) ([]SalesRow, error) {
	var reader io.Reader = bytes.NewReader(data)
	if len(data) > 2 && data[0] == 0x1f && data[1] == 0x8b {
		gz, err := gzip.NewReader(reader)
		if err != nil {
			return nil, malformed()
		}
		defer gz.Close()
		reader = io.LimitReader(gz, 128<<20)
	}
	r := csv.NewReader(reader)
	r.Comma = '\t'
	r.LazyQuotes = true
	r.FieldsPerRecord = -1
	header, err := r.Read()
	if err != nil {
		return nil, malformed()
	}
	col := map[string]int{}
	for i, name := range header {
		col[strings.TrimSpace(name)] = i
	}
	for _, need := range []string{"Units", "Product Type Identifier", "Apple Identifier"} {
		if _, ok := col[need]; !ok {
			return nil, malformed()
		}
	}
	get := func(rec []string, name string) string {
		if i, ok := col[name]; ok && i < len(rec) {
			return strings.TrimSpace(rec[i])
		}
		return ""
	}
	var rows []SalesRow
	for {
		rec, err := r.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, malformed()
		}
		units, _ := strconv.ParseFloat(get(rec, "Units"), 64)
		proceeds, _ := strconv.ParseFloat(get(rec, "Developer Proceeds"), 64)
		rows = append(rows, SalesRow{
			SKU:              get(rec, "SKU"),
			Title:            get(rec, "Title"),
			ProductType:      get(rec, "Product Type Identifier"),
			Units:            units,
			DeveloperProceed: proceeds,
			ProceedsCurrency: get(rec, "Currency of Proceeds"),
			CountryCode:      get(rec, "Country Code"),
			AppleID:          get(rec, "Apple Identifier"),
			ParentID:         get(rec, "Parent Identifier"),
		})
	}
	return rows, nil
}

// SalesKind groups Apple's product type identifiers.
func SalesKind(productType string) string {
	switch productType {
	case "1", "1F", "1T", "1E", "1EP", "1EU", "F1":
		return "download"
	case "3", "3F", "3T", "F3":
		return "redownload"
	case "7", "7F", "7T", "F7":
		return "update"
	case "IA1", "IA9", "IAY", "IAC", "FI1", "IA1-M", "IA9-M", "IAY-M":
		return "purchase"
	}
	return "other"
}
