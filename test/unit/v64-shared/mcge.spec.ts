import { MathConstraintGraphEngine } from '../../../shared/mcge/index';

describe('MathConstraintGraphEngine', () => {
  let engine: MathConstraintGraphEngine;
  beforeEach(() => { engine = new MathConstraintGraphEngine(); });

  it('should build constraint graph from elements', () => {
    const elements = [
      { id: 'el1', type: 'text', x: 0, y: 0, width: 100, height: 50, zIndex: 1 },
      { id: 'el2', type: 'chart', x: 120, y: 0, width: 200, height: 150, zIndex: 1 },
    ];
    const graph = engine.buildGraph(elements, 'tenant1');
    expect(graph).toBeDefined();
    expect(graph.tenantId).toBe('tenant1');
    expect(graph.nodes.size).toBe(2);
  });
});
