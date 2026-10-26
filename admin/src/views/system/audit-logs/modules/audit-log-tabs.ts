export type AuditLogTab = 'login' | 'oper'

export const AUDIT_LOG_TABS = [
  { name: 'login', label: '登录日志' },
  { name: 'oper', label: '操作日志' }
] as const satisfies readonly { name: AuditLogTab; label: string }[]
