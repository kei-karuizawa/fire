package main

import "testing"

func TestApplyEnvFileFillsMissingValues(t *testing.T) {
	t.Setenv("ASC_KEY_ID", "already-set")
	t.Setenv("ASC_AUTH_MODE", "")
	t.Setenv("ASC_ISSUER_ID", "")
	t.Setenv("ASC_PRIVATE_KEY_PATH", "")
	text := `
# comment
export ASC_AUTH_MODE=local
ASC_KEY_ID=from-file
ASC_ISSUER_ID="issuer id"
ASC_PRIVATE_KEY_PATH='/tmp/AuthKey.p8'
`
	if err := applyEnvFile(text); err != nil {
		t.Fatal(err)
	}
	if got := getenv("ASC_KEY_ID"); got != "already-set" {
		t.Fatalf("existing value changed to %q", got)
	}
	if getenv("ASC_AUTH_MODE") != "local" || getenv("ASC_ISSUER_ID") != "issuer id" || getenv("ASC_PRIVATE_KEY_PATH") != "/tmp/AuthKey.p8" {
		t.Fatalf("mode=%q issuer=%q path=%q", getenv("ASC_AUTH_MODE"), getenv("ASC_ISSUER_ID"), getenv("ASC_PRIVATE_KEY_PATH"))
	}
}

func getenv(name string) string {
	return env(name, "")
}
