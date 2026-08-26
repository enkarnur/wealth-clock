import { shouldUseLocalDataStore } from '../lib/platform';

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

const mobileSettingsKey = 'wealth-clock.mobile.settings.v1';
const mobileExpensesKey = 'wealth-clock.mobile.expenses.v1';

function defaultSettings(): SalarySettings {
  return {
    salaryType: 'monthly',
    salaryAmount: 0,
    workStart: '09:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
    workEnd: '18:00',
    weeklyWorkDays: 5,
    workDays: [1, 2, 3, 4, 5],
    savingsGoal: 0,
    backgroundImage: '',
    alwaysOnTop: false,
    configured: false,
    updatedAt: '',
  };
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeSettings(value: Partial<SalarySettings>): SalarySettings {
  const defaults = defaultSettings();
  return {
    ...defaults,
    ...value,
    workDays: Array.isArray(value.workDays) ? [...new Set(value.workDays)].sort((a, b) => a - b) : defaults.workDays,
    configured: Boolean(value.configured),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : defaults.updatedAt,
  };
}

function getLocalSettings(): SalarySettings {
  return normalizeSettings(readLocalJson<Partial<SalarySettings>>(mobileSettingsKey, defaultSettings()));
}

function saveLocalSettings(input: Omit<SalarySettings, 'configured' | 'updatedAt'>): SalarySettings {
  const saved = normalizeSettings({
    ...input,
    configured: true,
    updatedAt: new Date().toISOString(),
  });
  writeLocalJson(mobileSettingsKey, saved);
  return saved;
}

function getLocalExpenses(): Expense[] {
  const items = readLocalJson<Expense[]>(mobileExpensesKey, []);
  return Array.isArray(items) ? items : [];
}

function saveLocalExpenses(expenses: Expense[]) {
  writeLocalJson(mobileExpensesKey, expenses);
}

function sortExpenses(expenses: Expense[]) {
  return [...expenses].sort((left, right) => {
    if (left.spentAt !== right.spentAt) {
      return right.spentAt.localeCompare(left.spentAt);
    }
    return right.createdAt.localeCompare(left.createdAt);
  });
}

function resolveMonthRange(month?: string) {
  const resolvedMonth = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const start = new Date(`${resolvedMonth}-01T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    throw new Error('month must be a valid month in YYYY-MM format');
  }
  const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return {
    month: resolvedMonth,
    monthStart: resolvedMonth + '-01',
    nextMonthStart: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`,
  };
}

function countWorkDays(monthStart: string, nextMonthStart: string, workDays: number[]) {
  const start = new Date(`${monthStart}T00:00:00`);
  const end = new Date(`${nextMonthStart}T00:00:00`);
  const allowed = new Set(workDays);
  let count = 0;
  const cursor = new Date(start);
  while (cursor.getTime() < end.getTime()) {
    if (allowed.has(cursor.getDay())) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function listLocalExpensesByMonth(month?: string) {
  const { monthStart, nextMonthStart } = resolveMonthRange(month);
  const items = sortExpenses(getLocalExpenses()).filter((expense) => expense.spentAt >= monthStart && expense.spentAt < nextMonthStart);
  return { data: items, total: items.length };
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
  if (shouldUseLocalDataStore()) {
    return { data: getLocalSettings() };
  }
  return apiFetch('/api/settings');
}

export async function settingsUpdate(body: Omit<SalarySettings, 'configured' | 'updatedAt'>): Promise<{ data: SalarySettings }> {
  if (shouldUseLocalDataStore()) {
    return { data: saveLocalSettings(body) };
  }
  return apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(body) });
}

export async function dashboardList(params?: { month?: string }): Promise<{ data: Dashboard }> {
  if (shouldUseLocalDataStore()) {
    const settings = getLocalSettings();
    const { month, monthStart, nextMonthStart } = resolveMonthRange(params?.month);
    const totalExpenses = listLocalExpensesByMonth(month).data.reduce((sum, item) => sum + item.amount, 0);
    const expectedIncome = !settings.configured
      ? 0
      : settings.salaryType === 'monthly'
        ? settings.salaryAmount
        : settings.salaryAmount * countWorkDays(monthStart, nextMonthStart, settings.workDays);
    const net = expectedIncome - totalExpenses;
    const savingsProgress = settings.savingsGoal > 0 ? Math.min(100, Math.max(0, net) / settings.savingsGoal * 100) : 0;
    return {
      data: {
        month,
        expectedIncome,
        expenses: totalExpenses,
        net,
        savingsGoal: settings.savingsGoal,
        savingsProgress,
      },
    };
  }
  const search = new URLSearchParams();
  if (params?.month) search.set('month', params.month);
  return apiFetch(`/api/dashboard${search.toString() ? `?${search.toString()}` : ''}`);
}

export async function expensesList(params?: { month?: string }): Promise<{ data: Expense[]; total: number }> {
  if (shouldUseLocalDataStore()) {
    return listLocalExpensesByMonth(params?.month);
  }
  const search = new URLSearchParams();
  if (params?.month) search.set('month', params.month);
  return apiFetch(`/api/expenses${search.toString() ? `?${search.toString()}` : ''}`);
}

export async function expensesCreate(body: { amount: number; category: string; note: string; spentAt: string }): Promise<{ data: Expense }> {
  if (shouldUseLocalDataStore()) {
    const created: Expense = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount: body.amount,
      category: body.category.trim(),
      note: body.note.trim(),
      spentAt: body.spentAt,
      createdAt: new Date().toISOString(),
    };
    const current = getLocalExpenses();
    saveLocalExpenses(sortExpenses([created, ...current]));
    return { data: created };
  }
  return apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(body) });
}

export async function expensesByIdDelete(id: string): Promise<{ success: boolean }> {
  if (shouldUseLocalDataStore()) {
    const current = getLocalExpenses();
    const next = current.filter((item) => item.id !== id);
    if (next.length === current.length) {
      throw new Error('expense not found');
    }
    saveLocalExpenses(next);
    return { success: true };
  }
  return apiFetch(`/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
