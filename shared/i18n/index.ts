// Rasid v6.4 — Internationalization Engine with Arabic-First Support
import { BoundedMap } from '../bounded-collections';

export interface I18nConfig { defaultLocale: string; fallbackLocale: string; supportedLocales: string[]; rtlLocales: string[]; }

export interface TranslationEntry { key: string; values: Record<string, string>; context?: string; }

export class I18nEngine {
  private translations = new Map<string, Map<string, string>>();
  private readonly config: I18nConfig = {
    defaultLocale: 'ar', fallbackLocale: 'en',
    supportedLocales: ['ar', 'en', 'fr'],
    rtlLocales: ['ar', 'he', 'fa', 'ur'],
  };
  private currentLocale: string = 'ar';

  setLocale(locale: string): void {
    if (this.config.supportedLocales.includes(locale)) this.currentLocale = locale;
    else throw new Error(`Unsupported locale: ${locale}`);
  }

  getLocale(): string { return this.currentLocale; }
  isRTL(locale?: string): boolean { return this.config.rtlLocales.includes(locale || this.currentLocale); }
  getDirection(locale?: string): 'rtl' | 'ltr' { return this.isRTL(locale) ? 'rtl' : 'ltr'; }

  loadTranslations(locale: string, entries: Record<string, string>): void {
    if (!this.translations.has(locale)) this.translations.set(locale, new BoundedMap<string, string>(10_000));
    const map = this.translations.get(locale)!;
    for (const [key, value] of Object.entries(entries)) map.set(key, value);
  }

  t(key: string, params?: Record<string, string | number>): string {
    let value = this.translations.get(this.currentLocale)?.get(key)
      || this.translations.get(this.config.fallbackLocale)?.get(key)
      || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return value;
  }

  formatNumber(num: number, locale?: string): string {
    const loc = locale || this.currentLocale;
    if (loc === 'ar') return num.toLocaleString('ar-SA');
    return num.toLocaleString(loc);
  }

  formatDate(date: Date, style: 'short' | 'medium' | 'long' = 'medium', locale?: string): string {
    const loc = locale || this.currentLocale;
    const options: Intl.DateTimeFormatOptions = style === 'short'
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : style === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
        : { year: 'numeric', month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(loc === 'ar' ? 'ar-SA' : loc, options).format(date);
  }

  formatCurrency(amount: number, currency: string = 'SAR', locale?: string): string {
    const loc = locale || this.currentLocale;
    return new Intl.NumberFormat(loc === 'ar' ? 'ar-SA' : loc, { style: 'currency', currency }).format(amount);
  }

  pluralize(key: string, count: number, locale?: string): string {
    const loc = locale || this.currentLocale;
    if (loc === 'ar') {
      const suffix = count === 0 ? '_zero' : count === 1 ? '_one' : count === 2 ? '_two' : count <= 10 ? '_few' : '_many';
      return this.t(`${key}${suffix}`, { count }) || this.t(key, { count });
    }
    return this.t(count === 1 ? `${key}_one` : `${key}_other`, { count });
  }

  getMissingKeys(locale: string): string[] {
    const defaultKeys = this.translations.get(this.config.defaultLocale);
    const targetKeys = this.translations.get(locale);
    if (!defaultKeys) return [];
    if (!targetKeys) return [...defaultKeys.keys()];
    return [...defaultKeys.keys()].filter(k => !targetKeys.has(k));
  }

  getStats(): Record<string, { total: number; coverage: number }> {
    const defaultCount = this.translations.get(this.config.defaultLocale)?.size || 0;
    const stats: Record<string, { total: number; coverage: number }> = {};
    for (const locale of this.config.supportedLocales) {
      const count = this.translations.get(locale)?.size || 0;
      stats[locale] = { total: count, coverage: defaultCount > 0 ? count / defaultCount : 0 };
    }
    return stats;
  }
}
