package asc

import (
	"bytes"
	"compress/gzip"
	"testing"
)

const sampleReport = "Provider\tSKU\tTitle\tUnits\tDeveloper Proceeds\tCurrency of Proceeds\tCountry Code\tApple Identifier\tParent Identifier\tProduct Type Identifier\n" +
	"APPLE\tEMBER001\tEmber Planner\t12\t0\tUSD\tUS\t6447102938\t\t1F\n" +
	"APPLE\tember.pro.monthly\tEmber Pro Monthly\t3\t3.49\tUSD\tUS\t6502918841\tEMBER001\tIAY\n"

func TestParseSalesGzip(t *testing.T) {
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	gz.Write([]byte(sampleReport))
	gz.Close()
	rows, err := ParseSales(buf.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if len(rows) != 2 {
		t.Fatalf("got %d rows", len(rows))
	}
	if rows[0].Units != 12 || rows[0].AppleID != "6447102938" || SalesKind(rows[0].ProductType) != "download" {
		t.Fatalf("row 0 = %+v", rows[0])
	}
	if rows[1].DeveloperProceed != 3.49 || rows[1].ParentID != "EMBER001" || SalesKind(rows[1].ProductType) != "purchase" {
		t.Fatalf("row 1 = %+v", rows[1])
	}
}

func TestParseSalesRejectsOtherFiles(t *testing.T) {
	if _, err := ParseSales([]byte("not\ta\treport\n")); err == nil {
		t.Fatal("expected an error for a file without sales columns")
	}
}
