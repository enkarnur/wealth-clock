package backend

import (
	"context"
	"io/fs"
	"net/http"
	"strings"
	"time"
)

var (
	store       *sqliteStore
	fileModTime = time.Now()
)

func NewEmbeddedHandler(assets fs.FS) (http.Handler, func(), error) {
	store = mustInitStore()
	fileModTime = time.Now()

	indexHTML, err := fs.ReadFile(assets, "app/dist/index.html")
	if err != nil {
		_ = store.Close()
		store = nil
		return nil, nil, err
	}

	mux := http.NewServeMux()
	registerAPIRoutes(mux)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/api" {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if isAssetRequest(r.URL.Path) {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		serveSpaFile(w, r, "index.html", indexHTML)
	})

	cleanup := func() {
		if store != nil {
			_ = store.Close()
			store = nil
		}
	}

	return withCORS(mux), cleanup, nil
}

func LoadSettingsSnapshot(ctx context.Context) (SalarySettings, bool, error) {
	if store == nil {
		return defaultSettings(), false, nil
	}
	return store.GetSettings(ctx)
}

func registerAPIRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/settings", methodHandler(settingsList, settingsUpdate))
	mux.HandleFunc("/api/dashboard", methodHandler(dashboardList, nil))
	mux.HandleFunc("/api/expenses", expensesHandler)
	mux.HandleFunc("/api/expenses/", expenseByIDHandler)
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

func methodHandler(getHandler, writeHandler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			if getHandler == nil {
				writeError(w, http.StatusMethodNotAllowed, "method not allowed")
				return
			}
			getHandler(w, r)
		case http.MethodPut, http.MethodPost, http.MethodPatch, http.MethodDelete:
			if writeHandler == nil {
				writeError(w, http.StatusMethodNotAllowed, "method not allowed")
				return
			}
			writeHandler(w, r)
		default:
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
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
