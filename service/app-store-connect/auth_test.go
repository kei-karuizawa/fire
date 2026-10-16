package appstoreconnect

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
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestSignerAppleJWT(t *testing.T) {
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "test.p8")
	if err := os.WriteFile(path, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der}), 0600); err != nil {
		t.Fatal(err)
	}
	for _, kind := range []string{"team", "individual"} {
		t.Run(kind, func(t *testing.T) {
			issuer := ""
			if kind == "team" {
				issuer = "issuer-id"
			}
			signer, err := LoadSigner(path, "key-id", issuer, kind)
			if err != nil {
				t.Fatal(err)
			}
			token, err := signer.Token("GET /v1/apps/123")
			if err != nil {
				t.Fatal(err)
			}
			parts := strings.Split(token, ".")
			if len(parts) != 3 {
				t.Fatal("not a JWT")
			}
			header, err := base64.RawURLEncoding.DecodeString(parts[0])
			if err != nil {
				t.Fatal(err)
			}
			var headers map[string]string
			if err := json.Unmarshal(header, &headers); err != nil {
				t.Fatal(err)
			}
			if headers["alg"] != "ES256" || headers["kid"] != "key-id" || headers["typ"] != "JWT" {
				t.Fatal("wrong JWT header")
			}
			payload, err := base64.RawURLEncoding.DecodeString(parts[1])
			if err != nil {
				t.Fatal(err)
			}
			var claims map[string]any
			if err := json.Unmarshal(payload, &claims); err != nil {
				t.Fatal(err)
			}
			if claims["aud"] != "appstoreconnect-v1" || claims["exp"].(float64)-claims["iat"].(float64) != 300 || claims["exp"].(float64) <= float64(time.Now().Unix()) {
				t.Fatal("invalid JWT lifetime/audience")
			}
			if kind == "team" && (claims["iss"] != issuer || claims["sub"] != nil) {
				t.Fatal("invalid team claims")
			}
			if kind == "individual" && (claims["sub"] != "user" || claims["iss"] != nil) {
				t.Fatal("invalid individual claims")
			}
			if claims["scope"].([]any)[0] != "GET /v1/apps/123" {
				t.Fatal("scope missing")
			}
			signature, err := base64.RawURLEncoding.DecodeString(parts[2])
			if err != nil {
				t.Fatal(err)
			}
			if len(signature) != 64 {
				t.Fatal("signature must be JOSE R || S")
			}
			digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
			if !ecdsa.Verify(&key.PublicKey, digest[:], new(big.Int).SetBytes(signature[:32]), new(big.Int).SetBytes(signature[32:])) {
				t.Fatal("invalid signature")
			}
		})
	}
	if _, err := LoadSigner(path, "key-id", "", "team"); err == nil {
		t.Fatal("missing team issuer accepted")
	}
	if _, err := LoadSigner(path, "key-id", "issuer", "individual"); err == nil {
		t.Fatal("individual issuer accepted")
	}
	if err := os.WriteFile(path, []byte("invalid key"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := LoadSigner(path, "key-id", "issuer", "team"); err == nil {
		t.Fatal("invalid PEM accepted")
	}
	otherKey, err := ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	otherDER, err := x509.MarshalPKCS8PrivateKey(otherKey)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: otherDER}), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := LoadSigner(path, "key-id", "issuer", "team"); err == nil {
		t.Fatal("non P-256 key accepted")
	}
}
