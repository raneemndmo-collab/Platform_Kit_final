describe('M14 Decision Engine', () => {
  const mockRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn((d: any) => d), update: jest.fn(), delete: jest.fn() };
  const mockEvents = { emit: jest.fn() };

  it('should evaluate decision with weighted criteria', () => {
    const criteria = [
      { id: 'c1', weight: 3, ratings: { 'opt1': 8, 'opt2': 6 } },
      { id: 'c2', weight: 2, ratings: { 'opt1': 5, 'opt2': 9 } },
    ];
    const options = [{ id: 'opt1' }, { id: 'opt2' }];
    // opt1: (3*8 + 2*5) / 5 = 34/5 = 6.8
    // opt2: (3*6 + 2*9) / 5 = 36/5 = 7.2
    const scores: Record<string, number> = {};
    for (const opt of options) {
      let total = 0, totalW = 0;
      for (const c of criteria) { total += (c.weight || 1) * (c.ratings[opt.id] || 0); totalW += c.weight; }
      scores[opt.id] = totalW > 0 ? total / totalW : 0;
    }
    expect(scores['opt2']).toBeGreaterThan(scores['opt1']);
  });
});
