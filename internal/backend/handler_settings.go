package backend

import (
	"encoding/base64"
	"errors"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"
)

const maxBackgroundBytes = 2 << 20

func defaultSettings() SalarySettings {
	return SalarySettings{
		SalaryType: salaryTypeMonthly, WorkStart: "09:00", LunchStart: "12:00", LunchEnd: "13:00",
		WorkEnd: "18:00", WeeklyWorkDays: 5, WorkDays: []int{1, 2, 3, 4, 5},
		BackgroundImage: "", AlwaysOnTop: false, Configured: false, UpdatedAt: "",
	}
}

func settingsList(w http.ResponseWriter, r *http.Request) {
	value, found, err := store.GetSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if !found {
		value = defaultSettings()
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": value})
}

type settingsInput struct {
	SalaryType      *string  `json:"salaryType"`
	SalaryAmount    *float64 `json:"salaryAmount"`
	WorkStart       *string  `json:"workStart"`
	LunchStart      *string  `json:"lunchStart"`
	LunchEnd        *string  `json:"lunchEnd"`
	WorkEnd         *string  `json:"workEnd"`
	WeeklyWorkDays  *int     `json:"weeklyWorkDays"`
	WorkDays        *[]int   `json:"workDays"`
	SavingsGoal     *float64 `json:"savingsGoal"`
	BackgroundImage string   `json:"backgroundImage"`
	AlwaysOnTop     *bool    `json:"alwaysOnTop"`
}

func settingsUpdate(w http.ResponseWriter, r *http.Request) {
	var input settingsInput
	if err := decodeJSONRequest(w, r, &input); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if input.SalaryType == nil || input.SalaryAmount == nil || input.WorkStart == nil || input.LunchStart == nil ||
		input.LunchEnd == nil || input.WorkEnd == nil || input.WeeklyWorkDays == nil || input.WorkDays == nil ||
		input.SavingsGoal == nil || input.AlwaysOnTop == nil {
		writeError(w, http.StatusBadRequest, "all required settings fields must be provided")
		return
	}
	value := SalarySettings{
		SalaryType: *input.SalaryType, SalaryAmount: *input.SalaryAmount, WorkStart: *input.WorkStart,
		LunchStart: *input.LunchStart, LunchEnd: *input.LunchEnd, WorkEnd: *input.WorkEnd,
		WeeklyWorkDays: *input.WeeklyWorkDays, WorkDays: *input.WorkDays, SavingsGoal: *input.SavingsGoal,
		BackgroundImage: input.BackgroundImage, AlwaysOnTop: *input.AlwaysOnTop,
	}
	if err := validateSettings(&value); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	saved, err := store.PutSettings(r.Context(), value)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": saved})
}

func validateSettings(value *SalarySettings) error {
	if value.SalaryType != salaryTypeMonthly && value.SalaryType != salaryTypeDaily {
		return errors.New("salaryType must be monthly or daily")
	}
	if err := validateNonNegativeAmount("salaryAmount", value.SalaryAmount); err != nil {
		return err
	}
	if err := validateNonNegativeAmount("savingsGoal", value.SavingsGoal); err != nil {
		return err
	}
	times := []struct {
		name  string
		value string
	}{{"workStart", value.WorkStart}, {"lunchStart", value.LunchStart}, {"lunchEnd", value.LunchEnd}, {"workEnd", value.WorkEnd}}
	minutes := make([]int, len(times))
	for index, item := range times {
		parsed, err := parseClock(item.value)
		if err != nil {
			return fmt.Errorf("%s must use HH:mm", item.name)
		}
		minutes[index] = parsed
	}
	if minutes[0] > minutes[1] || minutes[1] > minutes[2] || minutes[2] > minutes[3] {
		return errors.New("work times must satisfy workStart <= lunchStart <= lunchEnd <= workEnd")
	}
	if value.WeeklyWorkDays < 1 || value.WeeklyWorkDays > 7 {
		return errors.New("weeklyWorkDays must be between 1 and 7")
	}
	if len(value.WorkDays) != value.WeeklyWorkDays {
		return errors.New("workDays count must equal weeklyWorkDays")
	}
	seen := make(map[int]bool, len(value.WorkDays))
	for _, day := range value.WorkDays {
		if day < 0 || day > 6 {
			return errors.New("workDays values must be between 0 and 6")
		}
		if seen[day] {
			return errors.New("workDays must not contain duplicates")
		}
		seen[day] = true
	}
	sort.Ints(value.WorkDays)
	if err := validateBackground(value.BackgroundImage); err != nil {
		return err
	}
	return nil
}

func validateNonNegativeAmount(name string, amount float64) error {
	if math.IsNaN(amount) || math.IsInf(amount, 0) || amount < 0 || amount > 1e12 {
		return fmt.Errorf("%s must be a finite number between 0 and 1000000000000", name)
	}
	return nil
}

func parseClock(value string) (int, error) {
	if len(value) != 5 || value[2] != ':' {
		return 0, errors.New("invalid time")
	}
	parsed, err := time.Parse("15:04", value)
	if err != nil || parsed.Format("15:04") != value {
		return 0, errors.New("invalid time")
	}
	return parsed.Hour()*60 + parsed.Minute(), nil
}

func validateBackground(value string) error {
	if value == "" {
		return nil
	}
	comma := strings.IndexByte(value, ',')
	if comma < 0 {
		return errors.New("backgroundImage must be an image Data URL")
	}
	header, payload := value[:comma], value[comma+1:]
	allowed := header == "data:image/png;base64" || header == "data:image/jpeg;base64" || header == "data:image/webp;base64"
	if !allowed {
		return errors.New("backgroundImage must be a base64 PNG, JPEG, or WEBP Data URL")
	}
	if base64.StdEncoding.DecodedLen(len(payload)) > maxBackgroundBytes {
		return errors.New("backgroundImage must not exceed 2 MiB")
	}
	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return errors.New("backgroundImage contains invalid base64 data")
	}
	if len(decoded) > maxBackgroundBytes {
		return errors.New("backgroundImage must not exceed 2 MiB")
	}
	return nil
}
