// settings 表：键值对（如 selectedChildId），随备份导出
export interface Setting {
  key: string
  value: unknown
}

export const SETTING_KEYS = {
  selectedChildId: 'selectedChildId',
  lastBackupAt: 'lastBackupAt',
  backupReminderSnoozedUntil: 'backupReminderSnoozedUntil',
} as const
