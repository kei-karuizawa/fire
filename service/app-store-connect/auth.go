// Package appstoreconnect provides a reusable App Store Connect client and local JWT signer.
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
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

// Signer holds a user-provided key in process memory; it never uploads the key.
type Signer struct {
	key                      *ecdsa.PrivateKey
	keyID, issuerID, keyType string
}

// LoadSigner reads an unencrypted PKCS#8 PEM .p8 file on the machine running this code.
// keyType is "team" (requires issuerID) or "individual" (must omit issuerID).
func LoadSigner(path, keyID, issuerID, keyType string) (*Signer, error) {
	if strings.TrimSpace(keyID) == "" {
		return nil, errors.New("ASC_KEY_ID is required")
	}
	if keyType != "team" && keyType != "individual" {
		return nil, errors.New("ASC_KEY_TYPE must be team or individual")
	}
	if keyType == "team" && strings.TrimSpace(issuerID) == "" {
		return nil, errors.New("ASC_ISSUER_ID is required for team keys")
	}
	if keyType == "individual" && issuerID != "" {
		return nil, errors.New("omit ASC_ISSUER_ID for individual keys")
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read local private key: %w", err)
	}
	block, rest := pem.Decode(data)
	if block == nil || block.Type != "PRIVATE KEY" || len(strings.TrimSpace(string(rest))) != 0 {
		return nil, errors.New("private key must contain one unencrypted PKCS#8 PRIVATE KEY PEM block")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, errors.New("invalid PKCS#8 private key")
	}
	key, ok := parsed.(*ecdsa.PrivateKey)
	if !ok || key.Curve != elliptic.P256() {
		return nil, errors.New("Apple ES256 requires an ECDSA P-256 private key")
	}
	return &Signer{key: key, keyID: keyID, issuerID: issuerID, keyType: keyType}, nil
}

// Token creates a five-minute Apple JWT. Optional scope entries use Apple's
// format, e.g. "GET /v1/apps/123". Callers must not log or persist this token.
func (s *Signer) Token(scope ...string) (string, error) {
	now := time.Now().Unix()
	header, _ := json.Marshal(map[string]string{"alg": "ES256", "kid": s.keyID, "typ": "JWT"})
	claims := map[string]any{"iat": now, "exp": now + 300, "aud": "appstoreconnect-v1"}
	if s.keyType == "individual" {
		claims["sub"] = "user"
	} else {
		claims["iss"] = s.issuerID
	}
	if len(scope) != 0 {
		claims["scope"] = scope
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	unsigned := base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(payload)
	digest := sha256.Sum256([]byte(unsigned))
	r, ss, err := ecdsa.Sign(rand.Reader, s.key, digest[:])
	if err != nil {
		return "", errors.New("sign Apple JWT")
	}
	// JWS uses fixed-width R || S, rather than ASN.1 DER.
	signature := make([]byte, 64)
	r.FillBytes(signature[:32])
	ss.FillBytes(signature[32:])
	return unsigned + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}
