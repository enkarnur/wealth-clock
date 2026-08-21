package backend

const (
	salaryTypeMonthly = "monthly"
	salaryTypeDaily   = "daily"
)

type SalarySettings struct {
	SalaryType      string  `json:"salaryType"`
	SalaryAmount    float64 `json:"salaryAmount"`
	WorkStart       string  `json:"workStart"`
	LunchStart      string  `json:"lunchStart"`
	LunchEnd        string  `json:"lunchEnd"`
	WorkEnd         string  `json:"workEnd"`
	WeeklyWorkDays  int     `json:"weeklyWorkDays"`
	WorkDays        []int   `json:"workDays"`
	SavingsGoal     float64 `json:"savingsGoal"`
	BackgroundImage string  `json:"backgroundImage"`
	AlwaysOnTop     bool    `json:"alwaysOnTop"`
	Configured      bool    `json:"configured"`
	UpdatedAt       string  `json:"updatedAt"`
}

type Expense struct {
	ID        string  `json:"id"`
	Amount    float64 `json:"amount"`
	Category  string  `json:"category"`
	Note      string  `json:"note"`
	SpentAt   string  `json:"spentAt"`
	CreatedAt string  `json:"createdAt"`
}

type Dashboard struct {
	Month           string  `json:"month"`
	ExpectedIncome  float64 `json:"expectedIncome"`
	Expenses        float64 `json:"expenses"`
	Net             float64 `json:"net"`
	SavingsGoal     float64 `json:"savingsGoal"`
	SavingsProgress float64 `json:"savingsProgress"`
}
