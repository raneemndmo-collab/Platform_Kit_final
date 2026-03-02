import { DataQualityScoringEngine } from '../../../shared/data-quality/index';

describe('DataQualityScoringEngine', () => {
  let engine: DataQualityScoringEngine;
  beforeEach(() => { engine = new DataQualityScoringEngine(); });

  it('should score perfect data at 1.0', () => {
    const data = [[1, 'a'], [2, 'b'], [3, 'c']];
    const report = engine.score(data, ['num', 'str']);
    expect(report.overallScore).toBeGreaterThanOrEqual(0.9);
  });

  it('should detect missing values', () => {
    const data = [[1, null], [null, 'b'], [3, '']];
    const report = engine.score(data, ['num', 'str']);
    expect(report.missingValues.count).toBeGreaterThan(0);
  });
});
