package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
)

func resolveDataDir() (string, error) {
	if dataDir := strings.TrimSpace(os.Getenv("WEALTH_CLOCK_DATA_DIR")); dataDir != "" {
		return dataDir, nil
	}
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return filepath.Join(wd, "data"), nil
}

func initStore() (*sqliteStore, error) {
	return newSQLiteStore()
}

func mustInitStore() *sqliteStore {
	st, err := initStore()
	if err != nil {
		panic(err)
	}
	return st
}

var errNotFound = errors.New("not found")
