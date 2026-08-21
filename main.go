package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"wealth-clock/internal/backend"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:app/dist
var assets embed.FS

func main() {
	if err := configureDesktopDataDir(); err != nil {
		log.Fatalf("configure data dir: %v", err)
	}

	app := NewDesktopApp()
	handler, cleanup, err := backend.NewEmbeddedHandler(assets)
	if err != nil {
		log.Fatalf("create backend handler: %v", err)
	}
	defer cleanup()

	err = wails.Run(&options.App{
		Title:            "财富时钟",
		Width:            440,
		Height:           720,
		MinWidth:         420,
		MinHeight:        320,
		AssetServer:      &assetserver.Options{Assets: assets, Handler: handler},
		BackgroundColour: &options.RGBA{R: 250, G: 251, B: 251, A: 1},
		OnStartup:        app.startup,
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "wealth-clock-desktop",
		},
	})
	if err != nil {
		log.Fatalf("start desktop app: %v", err)
	}
}

func configureDesktopDataDir() error {
	if os.Getenv("WEALTH_CLOCK_DATA_DIR") != "" {
		return nil
	}
	configDir, err := os.UserConfigDir()
	if err != nil {
		return err
	}
	dataDir := filepath.Join(configDir, "wealth-clock")
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return err
	}
	return os.Setenv("WEALTH_CLOCK_DATA_DIR", dataDir)
}
