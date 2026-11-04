// Package config reads Fire's settings from the environment and an optional .env file.
package config

import (
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"

	"fire/service/asc"
)

// Config is the backend's settings.
type Config struct {
	Addr           string
	BaseURL        string
	WebDir         string
	AllowedOrigins []string
	Signer         *asc.Signer
}

// Load reads .env (if present) and the environment.
func Load() (*Config, error) {
	if err := LoadDotEnv(); err != nil {
		return nil, err
	}
	c := &Config{
		Addr:    get("FIRE_ADDR", "127.0.0.1:8080"),
		BaseURL: get("ASC_BASE_URL", asc.AppleBaseURL),
		WebDir:  os.Getenv("FIRE_WEB_DIR"),
	}
	for _, origin := range strings.Split(os.Getenv("FIRE_ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			c.AllowedOrigins = append(c.AllowedOrigins, origin)
		}
	}
	keyPath, keyID, issuer := os.Getenv("ASC_PRIVATE_KEY_PATH"), os.Getenv("ASC_KEY_ID"), os.Getenv("ASC_ISSUER_ID")
	if keyPath != "" || keyID != "" {
		if keyPath == "" || keyID == "" {
			return nil, errors.New("set both ASC_PRIVATE_KEY_PATH and ASC_KEY_ID to use a server-side key")
		}
		keyType := asc.KeyType(get("ASC_KEY_TYPE", "team"))
		signer, err := asc.LoadSigner(keyPath, keyID, issuer, keyType)
		if err != nil {
			return nil, fmt.Errorf("server-side key: %w", err)
		}
		if !loopback(c.Addr) && os.Getenv("FIRE_ALLOW_REMOTE_SERVER_KEY") != "true" {
			return nil, errors.New("a server-side key lets anyone who can reach Fire use your App Store Connect account; " +
				"bind FIRE_ADDR to 127.0.0.1, or put Fire behind authentication and set FIRE_ALLOW_REMOTE_SERVER_KEY=true")
		}
		c.Signer = signer
	}
	return c, nil
}

func loopback(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return false
	}
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func get(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

// LoadDotEnv reads the first .env found in the working directory or service/.
// Variables already set in the environment win.
func LoadDotEnv() error {
	for _, path := range []string{".env", filepath.Join("service", ".env")} {
		data, err := os.ReadFile(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return err
		}
		if err := ApplyEnv(string(data)); err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		return nil
	}
	return nil
}

// ApplyEnv sets KEY=value lines that are not already set.
func ApplyEnv(text string) error {
	for n, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		k, v, ok := strings.Cut(line, "=")
		k = strings.TrimSpace(k)
		if !ok || k == "" || strings.ContainsAny(k, " \t") {
			return fmt.Errorf("line %d is not KEY=value", n+1)
		}
		v = strings.TrimSpace(v)
		if len(v) >= 2 && (v[0] == '"' || v[0] == '\'') && v[len(v)-1] == v[0] {
			v = v[1 : len(v)-1]
		}
		if _, set := os.LookupEnv(k); !set {
			if err := os.Setenv(k, v); err != nil {
				return err
			}
		}
	}
	return nil
}
