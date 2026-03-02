// =============================================================================
// Rasid Platform v6.2 — Timezone-Safe DateTime Utilities
// Constitutional Reference: FP-063, I18N-003
// =============================================================================

export class RasidDateTime {
  static now(): string { return new Date().toISOString(); }
  static nowDate(): Date { return new Date(); }
  static auditTimestamp(): string { return new Date().toISOString(); }
  static forTenant(date: Date | string, timezone: string, locale: string = 'en'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale, { timeZone: timezone });
  }
  static parse(iso: string): Date {
    const d = new Date(iso);
    if (isNaN(d.getTime())) throw new Error(`Invalid date: ${iso}`);
    return d;
  }
}
