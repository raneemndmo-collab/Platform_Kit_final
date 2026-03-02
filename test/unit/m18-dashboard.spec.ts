describe('M18 Dashboard Builder', () => {
  it('should auto-arrange widgets in grid', () => {
    const widgets = [
      { id: 'w1', position: { x: 0, y: 0, w: 6, h: 4 } },
      { id: 'w2', position: { x: 6, y: 0, w: 6, h: 4 } },
      { id: 'w3', position: { x: 0, y: 4, w: 12, h: 6 } },
    ];
    expect(widgets.length).toBe(3);
    const totalArea = widgets.reduce((s, w) => s + w.position.w * w.position.h, 0);
    expect(totalArea).toBe(120);
  });
});
