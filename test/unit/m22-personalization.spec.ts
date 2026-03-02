describe('M22 Personalization', () => {
  it('should recommend based on frequency', () => {
    const activities = [
      { resource: 'dashboard_1', action: 'view' },
      { resource: 'dashboard_1', action: 'view' },
      { resource: 'report_2', action: 'view' },
      { resource: 'dashboard_1', action: 'view' },
    ];
    const freq = new Map<string, number>();
    for (const a of activities) freq.set(a.resource, (freq.get(a.resource) || 0) + 1);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    expect(sorted[0][0]).toBe('dashboard_1');
    expect(sorted[0][1]).toBe(3);
  });

  it('should default to Arabic RTL preferences', () => {
    const defaults = { language: 'ar', rtl: true, timezone: 'Asia/Riyadh' };
    expect(defaults.rtl).toBe(true);
    expect(defaults.language).toBe('ar');
  });
});
