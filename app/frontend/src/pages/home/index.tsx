import { useEffect, useMemo, useState } from 'react';
import { Button, Collapse, DatePicker, Empty, Input, InputNumber, Modal, Progress, Select, Skeleton, Space, Typography } from '@arco-design/web-react';
import { ListRestart, Plus, RefreshCw, Settings, Trash2, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardList, expensesByIdDelete, expensesCreate, expensesList, settingsList, type Dashboard, type Expense, type SalarySettings } from '../../api/client.gen';
import { showMessage, useApiData, useText } from '../../lib/runtime';
import { calculateClock } from './calculations';
import styles from './index.module.css';

const messages = {
  todayEarned: '今日已到手',
  currency: '元',
  workProgress: '有效工时进度',
  before: '尚未上班',
  working: '正在累计',
  lunch: '午休中 · 暂停累计',
  after: '今日已完成',
  off: '今天不是工作日',
  perSecond: '每秒',
  perMinute: '每分钟',
  perHour: '每小时',
  settings: '设置',
  finance: '本月收支与存钱目标',
  expectedIncome: '预计收入',
  expenses: '本月支出',
  net: '预计净额',
  goal: '存钱目标',
  goalProgress: '目标进度',
  quickExpense: '快速记账与记录',
  amount: '金额',
  category: '分类',
  note: '备注（可选）',
  date: '日期',
  add: '记一笔',
  adding: '记录中…',
  records: '本月记录',
  noRecords: '本月还没有记账记录',
  delete: '删除',
  deleteTitle: '删除这条记录？',
  deleteText: '删除后无法恢复。',
  confirmDelete: '确认删除',
  cancel: '取消',
  saved: '已记录',
  saveFailed: '记录失败，请重试',
  deleted: '已删除',
  deleteFailed: '删除失败，请重试',
  loadFailed: '暂时无法读取数据',
  retry: '重新加载',
  setupTitle: '先完成工资设置',
  setupText: '设置工资类型、金额和工作时间后，财富时钟会开始实时累计。',
  startSetup: '开始设置',
  invalidAmount: '请输入大于 0 的金额',
  food: '餐饮',
  transport: '交通',
  shopping: '购物',
  housing: '居住',
  leisure: '娱乐',
  other: '其他',
  noGoal: '尚未设置目标',
  refresh: '刷新',
  rateHint: '速率按有效工时计算，午休不计入。',
  today: '今天',
  listError: '财务数据暂时不可用，可稍后重试。',
  noteFallback: '无备注',
};

type HomeData = {
  settings?: SalarySettings;
  dashboard?: Dashboard;
  expenses: Expense[];
  error?: string;
};

function localDateValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentMonth(): string {
  return localDateValue().slice(0, 7);
}

export default function WealthClockPage() {
  const t = useText(messages);
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [amount, setAmount] = useState<number | undefined>();
  const [category, setCategory] = useState('food');
  const [note, setNote] = useState('');
  const [spentAt, setSpentAt] = useState(localDateValue());
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, reload } = useApiData<HomeData>(async () => {
    try {
      const settingsResponse = await settingsList();
      if (!settingsResponse.data.configured) {
        return { settings: settingsResponse.data, expenses: [] };
      }
      const [dashboardResponse, expensesResponse] = await Promise.all([
        dashboardList({ month: currentMonth() }),
        expensesList({ month: currentMonth() }),
      ]);
      return { settings: settingsResponse.data, dashboard: dashboardResponse.data, expenses: expensesResponse.data };
    } catch (error) {
      return { expenses: [], error: error instanceof Error ? error.message : 'unknown' };
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const clock = useMemo(() => (data?.settings ? calculateClock(data.settings, now) : null), [data?.settings, now]);
  const formatter = useMemo(() => new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), []);
  const compactFormatter = useMemo(() => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }), []);
  const categoryLabels: Record<string, string> = { food: t.food, transport: t.transport, shopping: t.shopping, housing: t.housing, leisure: t.leisure, other: t.other };

  const submitExpense = async () => {
    if (!amount || amount <= 0) {
      showMessage(t.invalidAmount, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await expensesCreate({ amount, category, note: note.trim(), spentAt });
      setAmount(undefined);
      setNote('');
      await reload();
      showMessage(t.saved, 'success');
    } catch {
      showMessage(t.saveFailed, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExpense = (id: string) => {
    Modal.confirm({
      title: t.deleteTitle,
      content: t.deleteText,
      okText: t.confirmDelete,
      cancelText: t.cancel,
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        try {
          await expensesByIdDelete(id);
          await reload();
          showMessage(t.deleted, 'success');
        } catch (error) {
          showMessage(t.deleteFailed, 'error');
          throw error;
        }
      },
    });
  };

  if (loading && !data) {
    return <main className={styles.page}><div className={styles.shell}><Skeleton loading animation text={{ rows: 8 }} /></div></main>;
  }

  if (!data || data.error || !data.settings) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.error} role="alert">
            <h1 className={styles.errorTitle}>{t.loadFailed}</h1>
            <p className={styles.errorText}>{t.listError}</p>
            <Button type="primary" icon={<RefreshCw size={16} />} onClick={reload}>{t.retry}</Button>
          </section>
        </div>
      </main>
    );
  }

  if (!data.settings.configured) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.guide}>
            <WalletCards size={24} aria-hidden="true" />
            <h1 className={styles.guideTitle}>{t.setupTitle}</h1>
            <p className={styles.guideText}>{t.setupText}</p>
            <Button type="primary" onClick={() => navigate('/settings')}>{t.startSetup}</Button>
          </section>
        </div>
      </main>
    );
  }

  const phaseLabel = clock ? t[clock.phase] : '';
  const backgroundStyle = data.settings.backgroundImage ? { backgroundImage: `url(${data.settings.backgroundImage})` } : undefined;
  const dashboard = data.dashboard;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.clockCard} style={backgroundStyle}>
          <div className={styles.clockContent}>
            <header className={styles.header}>
              <div>
                <p className={styles.eyebrow}>{t.today} · {phaseLabel}</p>
                <Typography.Text type="secondary">{now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Typography.Text>
              </div>
              <Button type="text" icon={<Settings size={18} />} onClick={() => navigate('/settings')} aria-label={t.settings} />
            </header>

            <div>
              <p className={styles.eyebrow}>{t.todayEarned}</p>
              <p className={styles.amount}>{formatter.format(clock?.earned ?? 0)}<span className={styles.amountUnit}>{t.currency}</span></p>
            </div>

            <div className={styles.progressBlock}>
              <div className={styles.progressLabels}><span>{t.workProgress}</span><span>{compactFormatter.format(clock?.progress ?? 0)}%</span></div>
              <Progress percent={clock?.progress ?? 0} showText={false} />
            </div>

            <div>
              <div className={styles.rateGrid}>
                {([[t.perSecond, clock?.perSecond], [t.perMinute, clock?.perMinute], [t.perHour, clock?.perHour]] as Array<[string, number | undefined]>).map(([label, value]) => (
                  <div className={styles.rateItem} key={label}>
                    <span className={styles.rateLabel}>{label}</span>
                    <span className={styles.rateValue}>¥{compactFormatter.format(value ?? 0)}</span>
                  </div>
                ))}
              </div>
              <Typography.Text className={styles.muted}>{t.rateHint}</Typography.Text>
            </div>
          </div>
        </section>

        <Collapse className={styles.panel} bordered={false} lazyload>
          <Collapse.Item name="finance" header={t.finance}>
            {dashboard ? (
              <div className={styles.summaryGrid}>
                <div className={styles.summaryRow}><span>{t.expectedIncome}</span><span className={styles.summaryValue}>¥{formatter.format(dashboard.expectedIncome)}</span></div>
                <div className={styles.summaryRow}><span>{t.expenses}</span><span className={styles.summaryValue}>−¥{formatter.format(dashboard.expenses)}</span></div>
                <div className={styles.summaryRow}><span>{t.net}</span><span className={styles.summaryValue}>¥{formatter.format(dashboard.net)}</span></div>
                <div className={styles.summaryRow}><span>{t.goal}</span><span className={styles.summaryValue}>{dashboard.savingsGoal > 0 ? `¥${formatter.format(dashboard.savingsGoal)}` : t.noGoal}</span></div>
                {dashboard.savingsGoal > 0 && <Progress percent={Math.min(100, dashboard.savingsProgress)} formatText={() => `${t.goalProgress} ${compactFormatter.format(dashboard.savingsProgress)}%`} />}
              </div>
            ) : <Empty description={t.listError} />}
          </Collapse.Item>
        </Collapse>

        <Collapse className={styles.panel} bordered={false} lazyload>
          <Collapse.Item name="expenses" header={t.quickExpense}>
            <div className={styles.form}>
              <div className={styles.fieldRow}>
                <InputNumber min={0.01} precision={2} value={amount} onChange={setAmount} placeholder={t.amount} className={styles.fullWidth} />
                <Select value={category} onChange={setCategory}>
                  {Object.entries(categoryLabels).map(([value, label]) => <Select.Option key={value} value={value}>{label}</Select.Option>)}
                </Select>
              </div>
              <Input value={note} onChange={setNote} maxLength={120} showWordLimit placeholder={t.note} />
              <DatePicker value={spentAt} onChange={(value) => setSpentAt(String(value))} allowClear={false} className={styles.fullWidth} />
              <Button type="primary" long loading={submitting} icon={<Plus size={16} />} onClick={() => void submitExpense()}>{submitting ? t.adding : t.add}</Button>
            </div>
            <div className={styles.sectionHeader}>
              <Typography.Text bold>{t.records}</Typography.Text>
              <Button type="text" size="small" icon={<ListRestart size={15} />} onClick={reload}>{t.refresh}</Button>
            </div>
            {data.expenses.length === 0 ? <Empty description={t.noRecords} /> : (
              <div className={styles.expenseList}>
                {data.expenses.map((expense) => (
                  <div className={styles.expenseRow} key={expense.id}>
                    <div className={styles.expenseMain}>
                      <div className={styles.expenseTitle}>{categoryLabels[expense.category] ?? expense.category} · {expense.note || t.noteFallback}</div>
                      <div className={styles.expenseMeta}>{expense.spentAt}</div>
                    </div>
                    <Space size="mini">
                      <span className={styles.expenseAmount}>−¥{formatter.format(expense.amount)}</span>
                      <Button type="text" status="danger" icon={<Trash2 size={16} />} aria-label={t.delete} onClick={() => deleteExpense(expense.id)} />
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </Collapse.Item>
        </Collapse>
      </div>
    </main>
  );
}
