export interface ClockSettings {
  salaryType: string;
  salaryAmount: number;
  workStart: string;
  lunchStart: string;
  lunchEnd: string;
  workEnd: string;
  weeklyWorkDays: number;
  workDays: number[];
}

export interface ClockSnapshot {
  earned: number;
  progress: number;
  perSecond: number;
  perMinute: number;
  perHour: number;
  effectiveSeconds: number;
  totalSeconds: number;
  isWorkDay: boolean;
  phase: 'before' | 'working' | 'lunch' | 'after' | 'off';
}

function secondsAt(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60;
}

function overlap(start: number, end: number, rangeStart: number, rangeEnd: number): number {
  return Math.max(0, Math.min(end, rangeEnd) - Math.max(start, rangeStart));
}

export function calculateClock(settings: ClockSettings, now: Date): ClockSnapshot {
  const start = secondsAt(settings.workStart);
  const lunchStart = secondsAt(settings.lunchStart);
  const lunchEnd = secondsAt(settings.lunchEnd);
  const end = secondsAt(settings.workEnd);
  const totalSeconds = Math.max(1, end - start - overlap(start, end, lunchStart, lunchEnd));
  const averageMonthlyDays = Math.max(1, (settings.weeklyWorkDays * 52) / 12);
  const dailySalary = settings.salaryType === 'daily' ? settings.salaryAmount : settings.salaryAmount / averageMonthlyDays;
  const perSecond = dailySalary / totalSeconds;
  const isWorkDay = settings.workDays.includes(now.getDay());
  const current = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  if (!isWorkDay) {
    return { earned: 0, progress: 0, perSecond, perMinute: perSecond * 60, perHour: perSecond * 3600, effectiveSeconds: 0, totalSeconds, isWorkDay, phase: 'off' };
  }

  const capped = Math.max(start, Math.min(current, end));
  const effectiveSeconds = Math.max(0, capped - start - overlap(start, capped, lunchStart, lunchEnd));
  const phase = current < start ? 'before' : current >= end ? 'after' : current >= lunchStart && current < lunchEnd ? 'lunch' : 'working';

  return {
    earned: effectiveSeconds * perSecond,
    progress: Math.min(100, Math.max(0, (effectiveSeconds / totalSeconds) * 100)),
    perSecond,
    perMinute: perSecond * 60,
    perHour: perSecond * 3600,
    effectiveSeconds,
    totalSeconds,
    isWorkDay,
    phase,
  };
}
