import { stripApiPrefix } from '../../common/constants/api-prefix';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_PATHS = new Set(['/api/auth/login', '/api/auth/logout', '/api/health']);
const SENSITIVE_FIELDS = new Set(['password', 'oldPassword', 'newPassword']);
const MAX_SUMMARY_LENGTH = 2000;

export function shouldAuditOperLog(method: string, path: string, userType?: string): boolean {
  if (!MUTATING_METHODS.has(method.toUpperCase())) {
    return false;
  }

  const normalizedPath = path.split('?')[0] ?? path;
  if (EXCLUDED_PATHS.has(normalizedPath)) {
    return false;
  }

  return userType === 'admin';
}

export function resolveModuleFromPath(path: string): string {
  const normalizedPath = stripApiPrefix(path.split('?')[0] ?? path);
  const segment = normalizedPath.replace(/^\//, '').split('/')[0];
  return segment || 'unknown';
}

export function resolveActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
}

export function sanitizeRequestBody(body: unknown): string | null {
  if (body === undefined || body === null) {
    return null;
  }

  const redacted = redactSensitiveFields(body);
  let summary = JSON.stringify(redacted);

  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = `${summary.slice(0, MAX_SUMMARY_LENGTH)}...`;
  }

  return summary;
}

function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveFields(item));
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_FIELDS.has(key) ? '***' : redactSensitiveFields(nested);
    }
    return result;
  }

  return value;
}
