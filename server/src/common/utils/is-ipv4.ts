const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

/** 校验 IPv4 字面量（不含 CIDR） */
export function isIpv4(value: string): boolean {
  return IPV4_REGEX.test(value.trim());
}
