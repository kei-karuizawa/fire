// Package asc is a small App Store Connect API client: a JSON:API transport,
// an ES256 token signer for .p8 keys, and a Sales and Trends report reader.
// It has no third-party dependencies, so the backend and a future CLI can share it.
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
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// KeyType is the kind of App Store Connect API key.
type KeyType string

const (
	TeamKey       KeyType = "team"
	IndividualKey KeyType = "individual"
)

// TokenLifetime is how long signed tokens stay valid. Apple accepts up to 20 minutes.
const TokenLifetime = 10 * time.Minute

var (
	keyIDPattern    = regexp.MustCompile(`^[A-Z0-9]{10}$`)
	issuerIDPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

// Signer issues Apple JWTs from a private key held in process memory.
type Signer struct {
	key      *ecdsa.PrivateKey
	KeyID    string
	IssuerID string
	Type     KeyType
	now      func() time.Time
}

// KeyInfo describes a signer without exposing its key.
type KeyInfo struct {
	KeyID    string  `json:"keyId"`
	IssuerID string  `json:"issuerId,omitempty"`
	Type     KeyType `json:"keyType"`
}

// Info returns the public identity of the key.
func (s *Signer) Info() KeyInfo { return KeyInfo{KeyID: s.KeyID, IssuerID: s.IssuerID, Type: s.Type} }

// LoadSigner reads an unencrypted PKCS#8 .p8 file.
func LoadSigner(path, keyID, issuerID string, keyType KeyType) (*Signer, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read private key: %w", err)
	}
	return NewSigner(data, keyID, issuerID, keyType)
}

// NewSigner parses PEM data from a .p8 file.
func NewSigner(pemData []byte, keyID, issuerID string, keyType KeyType) (*Signer, error) {
	keyID = strings.TrimSpace(keyID)
	issuerID = strings.TrimSpace(issuerID)
	if !keyIDPattern.MatchString(keyID) {
		return nil, errors.New("key ID must be 10 uppercase letters and digits")
	}
	switch keyType {
	case TeamKey:
		if !issuerIDPattern.MatchString(issuerID) {
			return nil, errors.New("team keys need an issuer ID (a UUID)")
		}
	case IndividualKey:
		if issuerID != "" {
			return nil, errors.New("individual keys have no issuer ID")
		}
	default:
		return nil, errors.New("key type must be team or individual")
	}
	block, rest := pem.Decode(pemData)
	if block == nil || block.Type != "PRIVATE KEY" || strings.TrimSpace(string(rest)) != "" {
		return nil, errors.New("private key must be one unencrypted PKCS#8 PRIVATE KEY block")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, errors.New("invalid PKCS#8 private key")
	}
	key, ok := parsed.(*ecdsa.PrivateKey)
	if !ok || key.Curve != elliptic.P256() {
		return nil, errors.New("App Store Connect keys are ECDSA P-256")
	}
	return &Signer{key: key, KeyID: keyID, IssuerID: issuerID, Type: keyType, now: time.Now}, nil
}

// Token signs a JWT valid for TokenLifetime. Never log or persist the result.
func (s *Signer) Token() (string, error) {
	now := s.now().Unix()
	header, _ := json.Marshal(map[string]string{"alg": "ES256", "kid": s.KeyID, "typ": "JWT"})
	claims := map[string]any{"iat": now, "exp": now + int64(TokenLifetime/time.Second), "aud": "appstoreconnect-v1"}
	if s.Type == IndividualKey {
		claims["sub"] = "user"
	} else {
		claims["iss"] = s.IssuerID
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	unsigned := base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(payload)
	digest := sha256.Sum256([]byte(unsigned))
	r, sig, err := ecdsa.Sign(rand.Reader, s.key, digest[:])
	if err != nil {
		return "", errors.New("sign token")
	}
	// JWS ES256 uses fixed-width R || S, not ASN.1 DER.
	raw := make([]byte, 64)
	r.FillBytes(raw[:32])
	sig.FillBytes(raw[32:])
	return unsigned + "." + base64.RawURLEncoding.EncodeToString(raw), nil
}

// CachedToken returns a token and reuses it until two minutes before expiry.
type CachedToken struct {
	Signer  *Signer
	mu      sync.Mutex
	token   string
	expires time.Time
}

func (c *CachedToken) Token() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && c.expires.Sub(c.Signer.now()) > 2*time.Minute {
		return c.token, nil
	}
	token, err := c.Signer.Token()
	if err != nil {
		return "", err
	}
	c.token, c.expires = token, c.Signer.now().Add(TokenLifetime)
	return token, nil
}
