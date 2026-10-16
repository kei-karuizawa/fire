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
	"strings"
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

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func run() error {
	apiToken := os.Getenv("FIRE_API_TOKEN")
	if len(apiToken) < 32 || strings.TrimSpace(apiToken) != apiToken {
		return errors.New("set FIRE_API_TOKEN to a random secret of at least 32 characters")
	}
	baseURL := env("ASC_BASE_URL", appstoreconnect.AppleBaseURL)
	client, err := appstoreconnect.NewClient(baseURL)
	if err != nil {
		return err
	}
	var signer *appstoreconnect.Signer
	switch env("ASC_AUTH_MODE", "local") {
	case "local":
		signer, err = appstoreconnect.LoadSigner(os.Getenv("ASC_PRIVATE_KEY_PATH"), os.Getenv("ASC_KEY_ID"), os.Getenv("ASC_ISSUER_ID"), env("ASC_KEY_TYPE", "team"))
		if err != nil {
			return err
		}
	case "relay":
		if os.Getenv("ASC_PRIVATE_KEY_PATH") != "" || os.Getenv("ASC_KEY_ID") != "" || os.Getenv("ASC_ISSUER_ID") != "" {
			return errors.New("remove Apple key settings in relay mode; clients sign locally")
		}
	default:
		return errors.New("ASC_AUTH_MODE must be local or relay")
	}
	origin := os.Getenv("FIRE_ALLOWED_ORIGIN")
	if origin == "*" || origin == "null" || strings.ContainsAny(origin, "\r\n") {
		return errors.New("FIRE_ALLOWED_ORIGIN must be one explicit browser origin")
	}
	handler, err := httpapi.New(httpapi.Config{Client: client, Signer: signer, APIToken: apiToken, AllowedOrigin: origin})
	if err != nil {
		return err
	}
	server := &http.Server{Addr: env("FIRE_ADDR", "127.0.0.1:8080"), Handler: handler, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 25 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	listener, err := net.Listen("tcp", server.Addr)
	if err != nil {
		return fmt.Errorf("HTTP listener: %w", err)
	}
	done := make(chan error, 1)
	go func() { done <- server.Serve(listener) }()
	log.Printf("Fire listening on %s (Apple auth: %s)", server.Addr, env("ASC_AUTH_MODE", "local"))
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
