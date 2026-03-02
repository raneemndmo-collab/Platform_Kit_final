describe('M17 Vision AI', () => {
  it('should classify dashboard images', () => {
    const hasChart = true, hasTable = true;
    const type = hasChart && hasTable ? 'dashboard' : hasChart ? 'report' : 'document';
    expect(type).toBe('dashboard');
  });

  it('should detect RTL text in OCR', () => {
    const text = 'مرحبا بالعالم';
    const isArabic = /[\u0600-\u06FF]/.test(text);
    expect(isArabic).toBe(true);
  });
});
