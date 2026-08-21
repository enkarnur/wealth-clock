package main

import (
	"context"

	"wealth-clock/internal/backend"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

type DesktopApp struct {
	ctx context.Context
}

func NewDesktopApp() *DesktopApp {
	return &DesktopApp{}
}

func (a *DesktopApp) startup(ctx context.Context) {
	a.ctx = ctx
	wailsRuntime.WindowCenter(ctx)
	if settings, found, err := backend.LoadSettingsSnapshot(ctx); err == nil && found {
		wailsRuntime.WindowSetAlwaysOnTop(ctx, settings.AlwaysOnTop)
	}
}
