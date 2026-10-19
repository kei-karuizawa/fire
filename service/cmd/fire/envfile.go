package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// loadDotEnv reads the first .env file it finds. Variables already set in the
// process environment are left unchanged.
func loadDotEnv() error {
	for _, path := range []string{".env", filepath.Join("service", ".env")} {
		data, err := os.ReadFile(path)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return err
		}
		if err := applyEnvFile(string(data)); err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		return nil
	}
	return nil
}

func applyEnvFile(text string) error {
	for number, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		line = strings.TrimPrefix(line, "export ")
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			return fmt.Errorf("line %d is not KEY=value", number+1)
		}
		key = strings.TrimSpace(key)
		if key == "" || strings.ContainsAny(key, " \t") {
			return fmt.Errorf("line %d has an invalid name", number+1)
		}
		value = strings.TrimSpace(value)
		if len(value) >= 2 {
			if (value[0] == '"' && value[len(value)-1] == '"') || (value[0] == '\'' && value[len(value)-1] == '\'') {
				value = value[1 : len(value)-1]
			}
		}
		if os.Getenv(key) == "" {
			if err := os.Setenv(key, value); err != nil {
				return err
			}
		}
	}
	return nil
}
