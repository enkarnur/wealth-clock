package backend

import (
	"math"
	"net/http"
	"time"
)

func dashboardList(w http.ResponseWriter, r *http.Request) {
	month, monthStart, nextMonth, err := parseMonth(r.URL.Query().Get("month"), time.Now())
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	settings, found, err := store.GetSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !found {
		settings = defaultSettings()
	}
	totalExpenses, err := store.SumExpenses(r.Context(), monthStart, nextMonth)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	expectedIncome := 0.0
	if found {
		switch settings.SalaryType {
		case salaryTypeMonthly:
			expectedIncome = settings.SalaryAmount
		case salaryTypeDaily:
			expectedIncome = settings.SalaryAmount * float64(countWorkDays(monthStart, nextMonth, settings.WorkDays))
		}
	}
	net := expectedIncome - totalExpenses
	progress := 0.0
	if settings.SavingsGoal > 0 {
		progress = math.Min(100, math.Max(0, net)/settings.SavingsGoal*100)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": Dashboard{
		Month: month, ExpectedIncome: expectedIncome, Expenses: totalExpenses, Net: net,
		SavingsGoal: settings.SavingsGoal, SavingsProgress: progress,
	}})
}

func countWorkDays(monthStart, nextMonth string, workDays []int) int {
	start, _ := time.Parse("2006-01-02", monthStart)
	end, _ := time.Parse("2006-01-02", nextMonth)
	allowed := make(map[int]bool, len(workDays))
	for _, day := range workDays {
		allowed[day] = true
	}
	count := 0
	for current := start; current.Before(end); current = current.AddDate(0, 0, 1) {
		if allowed[int(current.Weekday())] {
			count++
		}
	}
	return count
}
