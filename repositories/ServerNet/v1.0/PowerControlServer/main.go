package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"powerctrl/api"
	"powerctrl/database"
	"powerctrl/services"

	"github.com/jchv/go-webview2"
)

//go:embed web/*
var webFiles embed.FS

func main() {
	// Register to Windows Startup
	services.RegisterAutoStart()

	// 1. Setup Embedded UI File Server
	// The web files are inside the "web" directory in the embed.FS
	subFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatal("Failed to setup embedded fs:", err)
	}

	mux := http.NewServeMux()

	// Use standard FileServer for all static assets but disable caching so updates show in WebView2
	fsHandler := http.FileServer(http.FS(subFS))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
		w.Header().Set("Pragma", "no-cache")
		w.Header().Set("Expires", "0")
		fsHandler.ServeHTTP(w, r)
	})

	// Initialize database
	database.InitDB()

	// 2. Setup API Routes
	api.RegisterRoutes(mux)

	// 3. Start the Server on a static external port for mobile access
	listener, err := net.Listen("tcp", ":8080")
	if err != nil {
		log.Println("Port 8080 is in use, falling back to a dynamic external port")
		listener, err = net.Listen("tcp", ":0")
		if err != nil {
			log.Fatal("Server failed to start:", err)
			os.Exit(1)
		}
	}

	port := listener.Addr().(*net.TCPAddr).Port
	url := fmt.Sprintf("http://127.0.0.1:%d", port)

	go func() {
		if err := http.Serve(listener, mux); err != nil {
			log.Fatal(err)
		}
	}()

	// 4. Launch Native Desktop Window using WebView2 (Edge Chromium, built into Windows)
	w := webview2.New(true)
	defer w.Destroy()
	w.SetTitle("PowerCtrl - 장비 전원 제어 시스템")
	w.SetSize(1200, 800, webview2.HintNone)
	w.Navigate(url)

	// 5. Start Background Device Status Monitor
	go func() {
		for {
			devices, err := database.GetAllDevices()
			if err == nil {
				for _, d := range devices {
					isReachable := services.CheckDeviceStatus(d.IP, d.Type)
					if d.IsOn != isReachable {
						// State changed, update DB
						database.ToggleDevicePower(d.ID, isReachable)
					}
				}
			}
			time.Sleep(10 * time.Second) // Check every 10 seconds
		}
	}()

	// 6. Start Schedule Automation Service
	services.StartScheduler()

	w.Run()
}
