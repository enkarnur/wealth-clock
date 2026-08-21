export interface SalarySettings {
  salaryType: 'monthly' | 'daily';
  salaryAmount: number;
  workStart: string;
  lunchStart: string;
  lunchEnd: string;
  workEnd: string;
  weeklyWorkDays: number;
  workDays: number[];
  savingsGoal: number;
  backgroundImage: string;
  alwaysOnTop: boolean;
  configured: boolean;
  updatedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string;
  spentAt: string;
  createdAt: string;
}

export interface Dashboard {
  month: string;
  expectedIncome: number;
  expenses: number;
  net: number;
  savingsGoal: number;
  savingsProgress: number;
}

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || '请求失败');
  }
  return payload as T;
}

export async function settingsList(): Promise<{ data: SalarySettings }> {
  return apiFetch('/api/settings');
}

export async function settingsUpdate(body: Omit<SalarySettings, 'configured' | 'updatedAt'>): Promise<{ data: SalarySettings }> {
  return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(body) });
}

export async function dashboardList(params?: { month?: string }): Promise<{ data: Dashboard }> {
  const search = new URLSearchParams();
  if (params?.month) search.set('month', params.month);
  return apiFetch(`/api/dashboard${search.toString() ? `?${search.toString()}` : ''}`);
}

export async function expensesList(params?: { month?: string }): Promise<{ data: Expense[]; total: number }> {
  const search = new URLSearchParams();
  if (params?.month) search.set('month', params.month);
  return apiFetch(`/api/expenses${search.toString() ? `?${search.toString()}` : ''}`);
}

export async function expensesCreate(body: { amount: number; category: string; note: string; spentAt: string }): Promise<{ data: Expense }> {
  return apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(body) });
}

export async function expensesByIdDelete(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
