package main

import (
	"errors"
	"math"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

type expenseInput struct {
	Amount   float64 `json:"amount"`
	Category string  `json:"category"`
	Note     string  `json:"note"`
	SpentAt  string  `json:"spentAt"`
}

func expensesList(w http.ResponseWriter, r *http.Request) {
	_, monthStart, nextMonth, err := parseMonth(r.URL.Query().Get("month"), time.Now())
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	values, err := store.ListExpenses(r.Context(), monthStart, nextMonth)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": values, "total": len(values)})
}

func expensesCreate(w http.ResponseWriter, r *http.Request) {
	var input expenseInput
	if err := decodeJSONRequest(w, r, &input); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	input.Category = strings.TrimSpace(input.Category)
	input.Note = strings.TrimSpace(input.Note)
	if math.IsNaN(input.Amount) || math.IsInf(input.Amount, 0) || input.Amount <= 0 || input.Amount > 1e12 {
		writeError(w, http.StatusBadRequest, "amount must be a finite number greater than 0 and at most 1000000000000")
		return
	}
	if input.Category == "" || utf8.RuneCountInString(input.Category) > 50 {
		writeError(w, http.StatusBadRequest, "category is required and must not exceed 50 characters")
		return
	}
	if utf8.RuneCountInString(input.Note) > 500 {
		writeError(w, http.StatusBadRequest, "note must not exceed 500 characters")
		return
	}
	if _, err := parseDate(input.SpentAt); err != nil {
		writeError(w, http.StatusBadRequest, "spentAt must be a valid date in YYYY-MM-DD format")
		return
	}
	created, err := store.CreateExpense(r.Context(), Expense{Amount: input.Amount, Category: input.Category, Note: input.Note, SpentAt: input.SpentAt})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": created})
}

func expensesByIDDelete(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/api/expenses/"))
	if id == "" || len(id) > 128 {
		writeError(w, http.StatusBadRequest, "invalid expense id")
		return
	}
	deleted, err := store.DeleteExpense(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !deleted {
		writeError(w, http.StatusNotFound, "expense not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

func parseDate(value string) (time.Time, error) {
	if len(value) != len("2006-01-02") {
		return time.Time{}, errors.New("invalid date")
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil || parsed.Format("2006-01-02") != value {
		return time.Time{}, errors.New("invalid date")
	}
	return parsed, nil
}

func parseMonth(value string, now time.Time) (string, string, string, error) {
	if value == "" {
		value = now.Format("2006-01")
	}
	if len(value) != len("2006-01") {
		return "", "", "", errors.New("month must be a valid month in YYYY-MM format")
	}
	parsed, err := time.Parse("2006-01", value)
	if err != nil || parsed.Format("2006-01") != value {
		return "", "", "", errors.New("month must be a valid month in YYYY-MM format")
	}
	return value, parsed.Format("2006-01-02"), parsed.AddDate(0, 1, 0).Format("2006-01-02"), nil
}
