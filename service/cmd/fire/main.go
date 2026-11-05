// Command fire runs the Fire backend and serves the web app.
package main

import (
	"context"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fire/service/asc"
	"fire/service/internal/config"
	"fire/service/internal/server"
	"fire/service/internal/webui"
)

var version = "dev"

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	client, err := asc.NewClient(cfg.BaseURL)
	if err != nil {
		return err
	}
	var web fs.FS = webui.FS()
	if cfg.WebDir != "" {
		web = os.DirFS(cfg.WebDir)
	}
	handler, err := server.New(server.Config{Client: client, Signer: cfg.Signer, Web: web, AllowedOrigins: cfg.AllowedOrigins, Version: version})
	if err != nil {
		return err
	}
	srv := &http.Server{
		Addr: cfg.Addr, Handler: handler,
		ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 120 * time.Second,
		IdleTimeout: 90 * time.Second, MaxHeaderBytes: 32 << 10,
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	errc := make(chan error, 1)
	go func() { errc <- srv.ListenAndServe() }()
	switch {
	case web == nil:
		log.Printf("Fire API listening on http://%s (web app not built in)", cfg.Addr)
	default:
		log.Printf("Fire listening on http://%s", cfg.Addr)
	}
	if cfg.Signer != nil {
		log.Printf("server-side key %s is available to browsers on this address", cfg.Signer.KeyID)
	}
	select {
	case err := <-errc:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdown)
	}
}
