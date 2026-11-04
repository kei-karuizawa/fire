package asc

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"math/big"
	"strings"
	"testing"
	"time"
)

func testKey(t *testing.T) (*ecdsa.PrivateKey, []byte) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	return key, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})
}

func decodePart(t *testing.T, part string) map[string]any {
	t.Helper()
	raw, err := base64.RawURLEncoding.DecodeString(part)
	if err != nil {
		t.Fatal(err)
	}
	out := map[string]any{}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func TestTeamTokenVerifies(t *testing.T) {
	key, pemData := testKey(t)
	signer, err := NewSigner(pemData, "ABCDE12345", "69a6de70-03db-47e3-e053-5b8c7c11a4d1", TeamKey)
	if err != nil {
		t.Fatal(err)
	}
	token, err := signer.Token()
	if err != nil {
		t.Fatal(err)
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("token has %d parts", len(parts))
	}
	header := decodePart(t, parts[0])
	if header["alg"] != "ES256" || header["kid"] != "ABCDE12345" {
		t.Fatalf("header = %v", header)
	}
	claims := decodePart(t, parts[1])
	if claims["iss"] != "69a6de70-03db-47e3-e053-5b8c7c11a4d1" || claims["aud"] != "appstoreconnect-v1" || claims["sub"] != nil {
		t.Fatalf("claims = %v", claims)
	}
	if life := claims["exp"].(float64) - claims["iat"].(float64); life != TokenLifetime.Seconds() {
		t.Fatalf("lifetime = %v", life)
	}
	sig, _ := base64.RawURLEncoding.DecodeString(parts[2])
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	r, s := new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:])
	if !ecdsa.Verify(&key.PublicKey, digest[:], r, s) {
		t.Fatal("signature does not verify")
	}
}

func TestIndividualTokenUsesSubject(t *testing.T) {
	_, pemData := testKey(t)
	signer, err := NewSigner(pemData, "ABCDE12345", "", IndividualKey)
	if err != nil {
		t.Fatal(err)
	}
	token, _ := signer.Token()
	claims := decodePart(t, strings.Split(token, ".")[1])
	if claims["sub"] != "user" || claims["iss"] != nil {
		t.Fatalf("claims = %v", claims)
	}
}

func TestSignerRejectsBadInput(t *testing.T) {
	_, pemData := testKey(t)
	cases := map[string]func() error{
		"key id": func() error {
			_, err := NewSigner(pemData, "short", "69a6de70-03db-47e3-e053-5b8c7c11a4d1", TeamKey)
			return err
		},
		"issuer": func() error { _, err := NewSigner(pemData, "ABCDE12345", "not-a-uuid", TeamKey); return err },
		"not a pem": func() error {
			_, err := NewSigner([]byte("hello"), "ABCDE12345", "69a6de70-03db-47e3-e053-5b8c7c11a4d1", TeamKey)
			return err
		},
	}
	for name, fn := range cases {
		if fn() == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

func TestCachedTokenReuses(t *testing.T) {
	_, pemData := testKey(t)
	signer, _ := NewSigner(pemData, "ABCDE12345", "69a6de70-03db-47e3-e053-5b8c7c11a4d1", TeamKey)
	now := time.Unix(1_800_000_000, 0)
	signer.now = func() time.Time { return now }
	cache := &CachedToken{Signer: signer}
	first, _ := cache.Token()
	now = now.Add(5 * time.Minute)
	if second, _ := cache.Token(); second != first {
		t.Fatal("token was not reused within its lifetime")
	}
	now = now.Add(4 * time.Minute)
	if third, _ := cache.Token(); third == first {
		t.Fatal("token was reused too close to expiry")
	}
}
