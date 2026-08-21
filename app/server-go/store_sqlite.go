package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type sqliteStore struct {
	db *sql.DB
}

func newSQLiteStore() (*sqliteStore, error) {
	dataDir, err := resolveDataDir()
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}
	return newSQLiteStoreAt(filepath.Join(dataDir, "wealth-clock.db"))
}

func newSQLiteStoreAt(path string) (*sqliteStore, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1)
	st := &sqliteStore{db: db}
	if err := st.initialize(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}
	return st, nil
}

func (s *sqliteStore) initialize(ctx context.Context) error {
	statements := []string{
		`PRAGMA journal_mode=WAL`,
		`PRAGMA foreign_keys=ON`,
		`CREATE TABLE IF NOT EXISTS salary_settings (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			salary_type TEXT NOT NULL CHECK (salary_type IN ('monthly', 'daily')),
			salary_amount REAL NOT NULL CHECK (salary_amount >= 0),
			work_start TEXT NOT NULL,
			lunch_start TEXT NOT NULL,
			lunch_end TEXT NOT NULL,
			work_end TEXT NOT NULL,
			weekly_work_days INTEGER NOT NULL CHECK (weekly_work_days BETWEEN 1 AND 7),
			work_days_json TEXT NOT NULL,
			savings_goal REAL NOT NULL CHECK (savings_goal >= 0),
			background_image TEXT NOT NULL DEFAULT '',
			always_on_top INTEGER NOT NULL DEFAULT 0 CHECK (always_on_top IN (0, 1)),
			updated_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS expenses (
			id TEXT PRIMARY KEY,
			amount REAL NOT NULL CHECK (amount > 0),
			category TEXT NOT NULL,
			note TEXT NOT NULL DEFAULT '',
			spent_at TEXT NOT NULL,
			created_at TEXT NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses (spent_at DESC)`,
	}
	for _, statement := range statements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("initialize sqlite schema: %w", err)
		}
	}
	return nil
}

func (s *sqliteStore) Close() error { return s.db.Close() }

func (s *sqliteStore) GetSettings(ctx context.Context) (SalarySettings, bool, error) {
	var value SalarySettings
	var workDaysJSON string
	var alwaysOnTop int
	err := s.db.QueryRowContext(ctx, `SELECT salary_type, salary_amount, work_start, lunch_start, lunch_end, work_end,
		weekly_work_days, work_days_json, savings_goal, background_image, always_on_top, updated_at
		FROM salary_settings WHERE id = 1`).Scan(
		&value.SalaryType, &value.SalaryAmount, &value.WorkStart, &value.LunchStart, &value.LunchEnd, &value.WorkEnd,
		&value.WeeklyWorkDays, &workDaysJSON, &value.SavingsGoal, &value.BackgroundImage, &alwaysOnTop, &value.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return SalarySettings{}, false, nil
	}
	if err != nil {
		return SalarySettings{}, false, err
	}
	if err := json.Unmarshal([]byte(workDaysJSON), &value.WorkDays); err != nil {
		return SalarySettings{}, false, fmt.Errorf("decode work days: %w", err)
	}
	value.AlwaysOnTop = alwaysOnTop != 0
	value.Configured = true
	return value, true, nil
}

func (s *sqliteStore) PutSettings(ctx context.Context, value SalarySettings) (SalarySettings, error) {
	workDaysJSON, err := json.Marshal(value.WorkDays)
	if err != nil {
		return SalarySettings{}, err
	}
	value.UpdatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	_, err = s.db.ExecContext(ctx, `INSERT INTO salary_settings (
		id, salary_type, salary_amount, work_start, lunch_start, lunch_end, work_end,
		weekly_work_days, work_days_json, savings_goal, background_image, always_on_top, updated_at
	) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET salary_type=excluded.salary_type, salary_amount=excluded.salary_amount,
		work_start=excluded.work_start, lunch_start=excluded.lunch_start, lunch_end=excluded.lunch_end,
		work_end=excluded.work_end, weekly_work_days=excluded.weekly_work_days,
		work_days_json=excluded.work_days_json, savings_goal=excluded.savings_goal,
		background_image=excluded.background_image, always_on_top=excluded.always_on_top,
		updated_at=excluded.updated_at`, value.SalaryType, value.SalaryAmount, value.WorkStart, value.LunchStart,
		value.LunchEnd, value.WorkEnd, value.WeeklyWorkDays, string(workDaysJSON), value.SavingsGoal,
		value.BackgroundImage, boolToInt(value.AlwaysOnTop), value.UpdatedAt)
	if err != nil {
		return SalarySettings{}, err
	}
	value.Configured = true
	return value, nil
}

func (s *sqliteStore) ListExpenses(ctx context.Context, monthStart, nextMonth string) ([]Expense, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, amount, category, note, spent_at, created_at
		FROM expenses WHERE spent_at >= ? AND spent_at < ? ORDER BY spent_at DESC, created_at DESC`, monthStart, nextMonth)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	values := make([]Expense, 0)
	for rows.Next() {
		var value Expense
		if err := rows.Scan(&value.ID, &value.Amount, &value.Category, &value.Note, &value.SpentAt, &value.CreatedAt); err != nil {
			return nil, err
		}
		values = append(values, value)
	}
	return values, rows.Err()
}

func (s *sqliteStore) CreateExpense(ctx context.Context, value Expense) (Expense, error) {
	value.ID = uuid.NewString()
	value.CreatedAt = time.Now().UTC().Format(time.RFC3339Nano)
	_, err := s.db.ExecContext(ctx, `INSERT INTO expenses (id, amount, category, note, spent_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		value.ID, value.Amount, value.Category, value.Note, value.SpentAt, value.CreatedAt)
	return value, err
}

func (s *sqliteStore) DeleteExpense(ctx context.Context, id string) (bool, error) {
	result, err := s.db.ExecContext(ctx, `DELETE FROM expenses WHERE id = ?`, id)
	if err != nil {
		return false, err
	}
	rows, err := result.RowsAffected()
	return rows > 0, err
}

func (s *sqliteStore) SumExpenses(ctx context.Context, monthStart, nextMonth string) (float64, error) {
	var total float64
	err := s.db.QueryRowContext(ctx, `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE spent_at >= ? AND spent_at < ?`, monthStart, nextMonth).Scan(&total)
	return total, err
}

func boolToInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
