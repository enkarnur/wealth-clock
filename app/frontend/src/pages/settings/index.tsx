import { useEffect, useState } from 'react';
import { Button, Checkbox, InputNumber, Radio, Skeleton, Switch, TimePicker, Upload } from '@arco-design/web-react';
import { ArrowLeft, ImagePlus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { settingsList, settingsUpdate, type SalarySettings } from '../../api/client.gen';
import { showMessage, useApiData, useText } from '../../lib/runtime';
import { applyWindowPreferences, isDesktopRuntime } from '../../lib/desktop';
import styles from './index.module.css';

const messages = {
  title: '财富时钟设置',
  subtitle: '配置工资、有效工时和桌面偏好',
  back: '返回财富时钟',
  salary: '工资',
  salaryType: '工资类型',
  monthly: '月薪',
  daily: '日薪',
  salaryAmount: '工资金额',
  schedule: '工作时间',
  workStart: '上班',
  lunchStart: '午休开始',
  lunchEnd: '午休结束',
  workEnd: '下班',
  workdays: '工作日',
  weeklyWorkDays: '每周工作天数',
  specificDays: '具体工作日',
  sunday: '周日',
  monday: '周一',
  tuesday: '周二',
  wednesday: '周三',
  thursday: '周四',
  friday: '周五',
  saturday: '周六',
  goalAppearance: '目标与外观',
  savingsGoal: '每月存钱目标',
  background: '背景照片',
  chooseImage: '选择照片',
  removeImage: '移除',
  imageHint: '支持 JPG、PNG、WebP，最大 2 MB。',
  pin: '偏好保持置顶',
  pinHint: '是否真正置顶取决于桌面容器是否支持。',
  pinHintDesktop: '桌面版会在保存后立即应用置顶偏好。',
  save: '保存设置',
  saving: '保存中…',
  saved: '设置已保存',
  desktopApplied: '桌面窗口偏好已立即应用',
  saveFailed: '保存失败，请重试',
  loadFailed: '无法加载设置',
  retry: '重试',
  invalidSalary: '工资金额不能小于 0',
  invalidGoal: '目标金额不能小于 0',
  invalidTimes: '请确保时间顺序为：上班 < 午休开始 < 午休结束 < 下班',
  invalidDays: '具体工作日数量需与每周工作天数一致',
  invalidImage: '请选择不超过 2 MB 的 JPG、PNG 或 WebP 图片',
  imageReady: '背景照片已载入',
};

type LoadResult = { settings?: SalarySettings; error?: string };

export default function SettingsPage() {
  const t = useText(messages);
  const navigate = useNavigate();
  const { data, loading, reload } = useApiData<LoadResult>(async () => {
    try {
      const response = await settingsList();
      return { settings: response.data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'unknown' };
    }
  }, []);
  const [form, setForm] = useState<SalarySettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.settings) setForm(data.settings);
  }, [data?.settings]);

  const dayOptions = [t.sunday, t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday].map((label, value) => ({ label, value }));

  const update = <K extends keyof SalarySettings>(key: K, value: SalarySettings[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const loadImage = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      showMessage(t.invalidImage, 'warning');
      return false;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update('backgroundImage', reader.result);
        showMessage(t.imageReady, 'success');
      }
    };
    reader.onerror = () => showMessage(t.invalidImage, 'error');
    reader.readAsDataURL(file);
    return false;
  };

  const save = async () => {
    if (!form) return;
    if (form.salaryAmount < 0) return showMessage(t.invalidSalary, 'warning');
    if (form.savingsGoal < 0) return showMessage(t.invalidGoal, 'warning');
    if (!(form.workStart < form.lunchStart && form.lunchStart < form.lunchEnd && form.lunchEnd < form.workEnd)) {
      return showMessage(t.invalidTimes, 'warning');
    }
    if (form.workDays.length !== form.weeklyWorkDays) return showMessage(t.invalidDays, 'warning');

    setSaving(true);
    try {
      const response = await settingsUpdate({
        salaryType: form.salaryType,
        salaryAmount: form.salaryAmount,
        workStart: form.workStart,
        lunchStart: form.lunchStart,
        lunchEnd: form.lunchEnd,
        workEnd: form.workEnd,
        weeklyWorkDays: form.weeklyWorkDays,
        workDays: form.workDays,
        savingsGoal: form.savingsGoal,
        backgroundImage: form.backgroundImage,
        alwaysOnTop: form.alwaysOnTop,
      });
      setForm(response.data);
      const applied = applyWindowPreferences({ alwaysOnTop: response.data.alwaysOnTop });
      showMessage(applied ? t.desktopApplied : t.saved, 'success');
      navigate('/');
    } catch {
      showMessage(t.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !form) {
    return <main className={styles.page}><div className={styles.shell}><Skeleton loading animation text={{ rows: 10 }} /></div></main>;
  }

  if (!form || data?.error) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.error} role="alert"><span>{t.loadFailed}</span><Button icon={<RefreshCw size={16} />} onClick={reload}>{t.retry}</Button></div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Button type="text" icon={<ArrowLeft size={18} />} onClick={() => navigate('/')} aria-label={t.back} />
          <div className={styles.titleGroup}><h1 className={styles.title}>{t.title}</h1><p className={styles.subtitle}>{t.subtitle}</p></div>
        </header>

        <div className={styles.panel}>
          <div className={styles.form}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t.salary}</h2>
              <div className={styles.grid}>
                <div className={styles.field}><span className={styles.label}>{t.salaryType}</span><Radio.Group type="button" value={form.salaryType} onChange={(value) => update('salaryType', value)}><Radio value="monthly">{t.monthly}</Radio><Radio value="daily">{t.daily}</Radio></Radio.Group></div>
                <div className={styles.field}><span className={styles.label}>{t.salaryAmount}</span><InputNumber min={0} precision={2} value={form.salaryAmount} onChange={(value) => update('salaryAmount', value ?? 0)} className={styles.fullWidth} /></div>
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t.schedule}</h2>
              <div className={styles.timeGrid}>
                {([['workStart', t.workStart], ['lunchStart', t.lunchStart], ['lunchEnd', t.lunchEnd], ['workEnd', t.workEnd]] as Array<[keyof SalarySettings, string]>).map(([key, label]) => (
                  <div className={styles.field} key={key}><span className={styles.label}>{label}</span><TimePicker format="HH:mm" value={String(form[key])} onChange={(value) => update(key, value as never)} className={styles.fullWidth} /></div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t.workdays}</h2>
              <div className={styles.field}><span className={styles.label}>{t.weeklyWorkDays}</span><InputNumber min={1} max={7} precision={0} value={form.weeklyWorkDays} onChange={(value) => update('weeklyWorkDays', value ?? 1)} /></div>
              <div className={styles.field}><span className={styles.label}>{t.specificDays}</span><Checkbox.Group className={styles.days} options={dayOptions} value={form.workDays} onChange={(value) => update('workDays', value as number[])} /></div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t.goalAppearance}</h2>
              <div className={styles.field}><span className={styles.label}>{t.savingsGoal}</span><InputNumber min={0} precision={2} value={form.savingsGoal} onChange={(value) => update('savingsGoal', value ?? 0)} className={styles.fullWidth} /></div>
              <div className={styles.field}>
                <span className={styles.label}>{t.background}</span>
                <div className={styles.fileRow}>
                  {form.backgroundImage && <img className={styles.preview} src={form.backgroundImage} alt="" />}
                  <Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} beforeUpload={loadImage}><Button icon={<ImagePlus size={16} />}>{t.chooseImage}</Button></Upload>
                  {form.backgroundImage && <Button type="text" status="danger" icon={<Trash2 size={16} />} onClick={() => update('backgroundImage', '')}>{t.removeImage}</Button>}
                </div>
                <p className={styles.fileMeta}>{t.imageHint}</p>
              </div>
              <div className={styles.switchRow}>
                <div><div className={styles.label}>{t.pin}</div><p className={styles.hint}>{isDesktopRuntime() ? t.pinHintDesktop : t.pinHint}</p></div>
                <Switch checked={form.alwaysOnTop} onChange={(value) => update('alwaysOnTop', value)} />
              </div>
            </section>

            <div className={styles.actions}>
              <Button onClick={() => navigate('/')}>{t.back}</Button>
              <Button type="primary" loading={saving} icon={<Save size={16} />} onClick={() => void save()}>{saving ? t.saving : t.save}</Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
