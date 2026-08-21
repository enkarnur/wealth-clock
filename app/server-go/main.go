package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var (
	store       *sqliteStore
	fileModTime = time.Now()
)

func main() {
	store = mustInitStore()
	defer store.Close()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/settings", methodHandler(settingsList, settingsUpdate))
	mux.HandleFunc("/api/dashboard", methodHandler(dashboardList, nil))
	mux.HandleFunc("/api/expenses", expensesHandler)
	mux.HandleFunc("/api/expenses/", expenseByIDHandler)
	mux.HandleFunc("/", spaHandler)

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "3000"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		panic(err)
	}
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func methodHandler(getHandler http.HandlerFunc, putHandler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			if getHandler == nil {
				writeError(w, http.StatusMethodNotAllowed, "method not allowed")
				return
			}
			getHandler(w, r)
		case http.MethodPut:
			if putHandler == nil {
				writeError(w, http.StatusMethodNotAllowed, "method not allowed")
				return
			}
			putHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	}
}

func expensesHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		expensesList(w, r)
	case http.MethodPost:
		expensesCreate(w, r)
	default:
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func expenseByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	expensesByIDDelete(w, r)
}

func spaHandler(w http.ResponseWriter, r *http.Request) {
	distDir := filepath.Join("app", "dist")
	indexPath := filepath.Join(distDir, "index.html")
	indexContent, err := os.ReadFile(indexPath)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "frontend dist is not built yet")
		return
	}

	requested := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if requested != "." && requested != "" && isAssetRequest(requested) {
		assetPath := filepath.Join(distDir, requested)
		assetContent, assetErr := os.ReadFile(assetPath)
		if assetErr == nil {
			serveSpaFile(w, r, assetPath, assetContent)
			return
		}
		if !os.IsNotExist(assetErr) {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
	}

	serveSpaFile(w, r, indexPath, indexContent)
}
