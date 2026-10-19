package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	appstoreconnect "fire/service/app-store-connect"
	"fire/service/internal/httpapi"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func webRoot() string {
	candidates := []string{}
	if exe, err := os.Executable(); err == nil {
		dir := filepath.Dir(exe)
		candidates = append(candidates, filepath.Join(dir, "web"), filepath.Join(dir, "..", "web"), filepath.Join(dir, "..", "..", "web"))
	}
	if cwd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Join(cwd, "web"), filepath.Join(cwd, "..", "web"))
	}
	for _, candidate := range candidates {
		info, err := os.Stat(filepath.Join(candidate, "index.html"))
		if err != nil || info.IsDir() {
			continue
		}
		abs, err := filepath.Abs(candidate)
		if err != nil {
			return candidate
		}
		return abs
	}
	return ""
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func run() error {
	if err := loadDotEnv(); err != nil {
		return err
	}
	baseURL := env("ASC_BASE_URL", appstoreconnect.AppleBaseURL)
	client, err := appstoreconnect.NewClient(baseURL)
	if err != nil {
		return err
	}
	var signer *appstoreconnect.Signer
	mode := env("ASC_AUTH_MODE", "")
	if mode == "" {
		if os.Getenv("ASC_PRIVATE_KEY_PATH") != "" || os.Getenv("ASC_KEY_ID") != "" {
			mode = "local"
		} else {
			mode = "relay"
		}
	}
	switch mode {
	case "local":
		signer, err = appstoreconnect.LoadSigner(os.Getenv("ASC_PRIVATE_KEY_PATH"), os.Getenv("ASC_KEY_ID"), os.Getenv("ASC_ISSUER_ID"), env("ASC_KEY_TYPE", "team"))
		if err != nil {
			return err
		}
	case "relay":
		if os.Getenv("ASC_PRIVATE_KEY_PATH") != "" || os.Getenv("ASC_KEY_ID") != "" || os.Getenv("ASC_ISSUER_ID") != "" {
			return errors.New("remove Apple key settings in relay mode; the browser signs with the .p8")
		}
	default:
		return errors.New("ASC_AUTH_MODE must be local or relay")
	}
	root := webRoot()
	handler, err := httpapi.New(httpapi.Config{Client: client, Signer: signer, WebRoot: root})
	if err != nil {
		return err
	}
	server := &http.Server{Addr: env("FIRE_ADDR", "127.0.0.1:8080"), Handler: handler, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 90 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	listener, err := net.Listen("tcp", server.Addr)
	if err != nil {
		return fmt.Errorf("HTTP listener: %w", err)
	}
	done := make(chan error, 1)
	go func() { done <- server.Serve(listener) }()
	if root == "" {
		log.Printf("Fire listening on %s (web UI not found)", server.Addr)
	} else {
		log.Printf("Fire listening on %s — open http://%s", server.Addr, server.Addr)
	}
	select {
	case err := <-done:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("HTTP server: %w", err)
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return server.Shutdown(shutdownCtx)
	}
}
