// Command fire-demo runs Fire against a built-in App Store Connect simulation
// with synthetic data, so you can try the web app without an Apple account.
// Nothing it does reaches Apple.
package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/pem"
	"flag"
	"log"
	"net"
	"net/http"
	"os"

	"fire/service/asc"
	"fire/service/internal/mockapple"
	"fire/service/internal/server"
	"fire/service/internal/webui"
)

func main() {
	addr := flag.String("addr", "127.0.0.1:8080", "address for the Fire web app")
	appleAddr := flag.String("apple-addr", "127.0.0.1:0", "address for the simulated App Store Connect API")
	webDir := flag.String("web", "", "serve the web app from this directory instead of the embedded build")
	browserKey := flag.Bool("browser-key", false, "do not give the server a key; add a profile in the browser instead")
	flag.Parse()

	listener, err := net.Listen("tcp", *appleAddr)
	if err != nil {
		log.Fatal(err)
	}
	go func() { log.Fatal(http.Serve(listener, mockapple.New())) }()
	baseURL := "http://" + listener.Addr().String()
	log.Printf("simulated App Store Connect API at %s", baseURL)

	client, err := asc.NewClient(baseURL)
	if err != nil {
		log.Fatal(err)
	}
	cfg := server.Config{Client: client, Web: webui.FS(), Version: "demo"}
	if *webDir != "" {
		cfg.Web = os.DirFS(*webDir)
	}
	if !*browserKey {
		// A throwaway key: the simulation accepts any well-formed ES256 token.
		key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
		der, _ := x509.MarshalPKCS8PrivateKey(key)
		pemData := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})
		if cfg.Signer, err = asc.NewSigner(pemData, "DEMO000001", "00000000-0000-0000-0000-000000000000", asc.TeamKey); err != nil {
			log.Fatal(err)
		}
	}
	handler, err := server.New(cfg)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Fire demo at http://%s", *addr)
	log.Fatal(http.ListenAndServe(*addr, handler))
}
