import { describe, expect, it } from 'vitest';
import { calculateClock, type ClockSettings } from './calculations';

const settings: ClockSettings = {
  salaryType: 'daily',
  salaryAmount: 700,
  workStart: '09:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  workEnd: '17:00',
  weeklyWorkDays: 5,
  workDays: [1, 2, 3, 4, 5],
};

describe('calculateClock', () => {
  it('does not count the lunch break', () => {
    const result = calculateClock(settings, new Date(2026, 7, 21, 13, 0, 0));
    expect(result.effectiveSeconds).toBe(3 * 3600);
    expect(result.earned).toBeCloseTo(300);
    expect(result.progress).toBeCloseTo(42.857, 2);
  });

  it('caps earnings after work and returns zero on non-workdays', () => {
    expect(calculateClock(settings, new Date(2026, 7, 21, 20, 0, 0)).earned).toBeCloseTo(700);
    expect(calculateClock(settings, new Date(2026, 7, 22, 13, 0, 0)).earned).toBe(0);
  });

  it('converts monthly salary with the configured weekly work days', () => {
    const monthly = calculateClock({ ...settings, salaryType: 'monthly', salaryAmount: 13000 }, new Date(2026, 7, 21, 17, 0, 0));
    expect(monthly.earned).toBeCloseTo(600);
  });
});
