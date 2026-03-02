// Rasid v6.4 — Mathematical Constraint Graph Engine (MCGE) — Part I
import { BoundedMap } from '../bounded-collections';
import { Injectable } from '@nestjs/common';

export enum ConstraintType {
  SPATIAL_RATIO = 'spatial_ratio', ALIGNMENT = 'alignment', PROPORTIONAL_MARGIN = 'proportional_margin',
  TYPOGRAPHY_BASELINE = 'typography_baseline', HIERARCHY_WEIGHT = 'hierarchy_weight',
  DENSITY_BALANCE = 'density_balance', ANCHOR_DISTANCE = 'anchor_distance',
  Z_LAYER_ORDER = 'z_layer_order', CHART_PROPORTION = 'chart_proportion', GRID_SNAP = 'grid_snap',
}

export interface ConstraintEdge {
  id: string; sourceNodeId: string; targetNodeId: string; type: ConstraintType;
  ratio: number; tolerance: number; priority: number; locked: boolean;
}

export interface ConstraintNode {
  id: string; elementType: string; x: number; y: number; width: number; height: number;
  zIndex: number; anchor: { x: number; y: number }; metadata: Record<string, unknown>;
}

export interface ConstraintGraph {
  id: string; tenantId: string; nodes: Map<string, ConstraintNode>; edges: ConstraintEdge[];
  gridSpec: GridSpec; densityMap: DensityVector[]; version: number;
}

export interface GridSpec {
  columns: number; rows: number; gutterX: number; gutterY: number;
  marginTop: number; marginRight: number; marginBottom: number; marginLeft: number;
  unitWidth: number; unitHeight: number;
}

export interface DensityVector { quadrant: 'TL'|'TR'|'BL'|'BR'; density: number; elementCount: number; weightedArea: number; }

export interface SolverResult {
  solved: boolean; iterations: number; maxResidual: number;
  violations: Array<{ edgeId: string; expected: number; actual: number; deviation: number; severity: string }>;
  adjustedNodes: Map<string, ConstraintNode>; graphSimilarity: number;
}

@Injectable()
export class MathConstraintGraphEngine {
  private readonly SIM_THRESHOLD = 0.999;
  private readonly MAX_ITER = 500;
  private readonly EPSILON = 0.0001;
  private readonly SUB_PX = 0.01;

  buildGraph(elements: unknown[], tenantId: string): ConstraintGraph {
    const nodes = new BoundedMap<string, ConstraintNode>(10_000);
    const edges: ConstraintEdge[] = [];
    for (const el of elements) {
      const n: ConstraintNode = {
        id: el.id || this.uid(), elementType: el.type || 'unknown',
        x: this.snap(el.x||0), y: this.snap(el.y||0), width: this.snap(el.width||0), height: this.snap(el.height||0),
        zIndex: el.zIndex||0, anchor: { x: (el.x||0)+(el.width||0)/2, y: (el.y||0)+(el.height||0)/2 }, metadata: el.metadata||{},
      };
      nodes.set(n.id, n);
    }
    const arr = [...nodes.values()];
    for (let i = 0; i < arr.length; i++) for (let j = i+1; j < arr.length; j++) edges.push(...this.detect(arr[i], arr[j]));
    return { id: this.uid(), tenantId, nodes, edges, gridSpec: this.inferGrid(arr), densityMap: this.density(arr), version: 1 };
  }

  solve(graph: ConstraintGraph): SolverResult {
    const adj = new BoundedMap<string, ConstraintNode>(10_000);
    graph.nodes.forEach((n, id) => adj.set(id, { ...n, anchor: { ...n.anchor } }));
    let iter = 0, maxR = Infinity;
    while (iter < this.MAX_ITER && maxR > this.EPSILON) {
      maxR = 0;
      for (const e of graph.edges) {
        if (e.locked) continue;
        const s = adj.get(e.sourceNodeId), t = adj.get(e.targetNodeId);
        if (!s || !t) continue;
        const r = this.residual(e, s, t);
        maxR = Math.max(maxR, Math.abs(r));
        if (Math.abs(r) > e.tolerance) this.correct(e, s, t, r * 0.5);
      }
      iter++;
    }
    const violations: SolverResult['violations'] = [];
    for (const e of graph.edges) {
      const s = adj.get(e.sourceNodeId), t = adj.get(e.targetNodeId);
      if (!s || !t) continue;
      const r = this.residual(e, s, t);
      if (Math.abs(r) > e.tolerance) violations.push({ edgeId: e.id, expected: e.ratio, actual: e.ratio+r, deviation: Math.abs(r), severity: Math.abs(r) > 5 ? 'critical' : 'warning' });
    }
    const sim = this.graphSim(graph.nodes, adj);
    return { solved: sim >= this.SIM_THRESHOLD, iterations: iter, maxResidual: maxR, violations, adjustedNodes: adj, graphSimilarity: sim };
  }

  verify(orig: ConstraintGraph, recon: ConstraintGraph): { graphSim: number; spatialSim: number; passes: boolean } {
    const gs = this.graphSim(orig.nodes, recon.nodes);
    const ss = this.spatialSim(orig, recon);
    return { graphSim: gs, spatialSim: ss, passes: gs >= this.SIM_THRESHOLD && ss >= this.SIM_THRESHOLD };
  }

  private detect(a: ConstraintNode, b: ConstraintNode): ConstraintEdge[] {
    const e: ConstraintEdge[] = [];
    if (Math.abs(a.y - b.y) <= 2) e.push(this.edge(a.id, b.id, ConstraintType.ALIGNMENT, 1, 2, 10));
    if (Math.abs(a.x - b.x) <= 2) e.push(this.edge(a.id, b.id, ConstraintType.ALIGNMENT, 1, 2, 10));
    if (a.width > 0 && b.width > 0) { const r = a.width/b.width; if (this.cleanRatio(r)) e.push(this.edge(a.id, b.id, ConstraintType.SPATIAL_RATIO, r, 0.01, 8)); }
    if (a.zIndex !== b.zIndex) e.push(this.edge(a.id, b.id, ConstraintType.Z_LAYER_ORDER, a.zIndex < b.zIndex ? -1 : 1, 0, 5));
    const d = Math.hypot(a.anchor.x-b.anchor.x, a.anchor.y-b.anchor.y);
    if (d > 0) e.push(this.edge(a.id, b.id, ConstraintType.ANCHOR_DISTANCE, d, 1, 3));
    return e;
  }

  private residual(e: ConstraintEdge, s: ConstraintNode, t: ConstraintNode): number {
    switch (e.type) {
      case ConstraintType.ALIGNMENT: return s.y - t.y;
      case ConstraintType.SPATIAL_RATIO: return (s.width/(t.width||1)) - e.ratio;
      case ConstraintType.ANCHOR_DISTANCE: return Math.hypot(s.anchor.x-t.anchor.x, s.anchor.y-t.anchor.y) - e.ratio;
      default: return 0;
    }
  }

  private correct(e: ConstraintEdge, s: ConstraintNode, t: ConstraintNode, c: number): void {
    switch (e.type) {
      case ConstraintType.ALIGNMENT: t.y += c; t.anchor.y += c; break;
      case ConstraintType.SPATIAL_RATIO: t.width += c * t.width * 0.1; break;
      case ConstraintType.ANCHOR_DISTANCE:
        const dx = t.anchor.x-s.anchor.x, dy = t.anchor.y-s.anchor.y, d = Math.hypot(dx, dy)||1;
        t.x += (dx/d)*c*0.1; t.y += (dy/d)*c*0.1; t.anchor.x += (dx/d)*c*0.1; t.anchor.y += (dy/d)*c*0.1; break;
    }
  }

  private graphSim(orig: Map<string, ConstraintNode>, adj: Map<string, ConstraintNode>): number {
    let dev = 0, cnt = 0;
    orig.forEach((o, id) => { const a = adj.get(id); if (!a) return; dev += Math.abs(o.x-a.x)+Math.abs(o.y-a.y)+Math.abs(o.width-a.width)+Math.abs(o.height-a.height); cnt++; });
    return cnt === 0 ? 1 : Math.max(0, 1 - dev/(cnt*4*1000));
  }

  private spatialSim(a: ConstraintGraph, b: ConstraintGraph): number {
    const m = new Map(a.edges.map(e => [`${e.sourceNodeId}-${e.targetNodeId}-${e.type}`, e.ratio]));
    let match = 0, total = 0;
    for (const e of b.edges) { const r = m.get(`${e.sourceNodeId}-${e.targetNodeId}-${e.type}`); if (r !== undefined && Math.abs(r-e.ratio)/(Math.abs(r)||1) < 0.01) match++; total++; }
    return total > 0 ? match/total : 1;
  }

  private inferGrid(nodes: ConstraintNode[]): GridSpec {
    if (!nodes.length) return { columns:12, rows:1, gutterX:16, gutterY:16, marginTop:24, marginRight:24, marginBottom:24, marginLeft:24, unitWidth:80, unitHeight:80 };
    const xs = [...new Set(nodes.map(n=>n.x))].sort((a,b)=>a-b), ys = [...new Set(nodes.map(n=>n.y))].sort((a,b)=>a-b);
    return { columns: Math.max(1,xs.length), rows: Math.max(1,ys.length), gutterX: this.medGap(xs), gutterY: this.medGap(ys),
      marginTop: Math.min(...nodes.map(n=>n.y)), marginRight:24, marginBottom:24, marginLeft: Math.min(...nodes.map(n=>n.x)),
      unitWidth: this.median(nodes.map(n=>n.width).filter(w=>w>0))||80, unitHeight: this.median(nodes.map(n=>n.height).filter(h=>h>0))||80 };
  }

  private density(nodes: ConstraintNode[]): DensityVector[] {
    const mx = (Math.max(...nodes.map(n=>n.x+n.width))+Math.min(...nodes.map(n=>n.x)))/2;
    const my = (Math.max(...nodes.map(n=>n.y+n.height))+Math.min(...nodes.map(n=>n.y)))/2;
    const q: Record<string, {c:number;a:number}> = { TL:{c:0,a:0}, TR:{c:0,a:0}, BL:{c:0,a:0}, BR:{c:0,a:0} };
    for (const n of nodes) { const k = (n.y+n.height/2<my?'T':'B')+(n.x+n.width/2<mx?'L':'R'); q[k].c++; q[k].a+=n.width*n.height; }
    const ta = Object.values(q).reduce((s,v)=>s+v.a,0)||1;
    return Object.entries(q).map(([k,v])=>({ quadrant: k as DensityVector['quadrant'], density: v.a/(ta/4), elementCount: v.c, weightedArea: v.a }));
  }

  private edge(s: string, t: string, type: ConstraintType, ratio: number, tol: number, pri: number): ConstraintEdge {
    return { id: this.uid(), sourceNodeId: s, targetNodeId: t, type, ratio, tolerance: tol, priority: pri, locked: false };
  }

  private snap(v: number): number { return Math.round(v/this.SUB_PX)*this.SUB_PX; }
  private cleanRatio(r: number): boolean { return [0.25,0.33,0.5,0.67,0.75,1,1.33,1.5,2,3,4].some(c=>Math.abs(r-c)<0.05); }
  private medGap(s: number[]): number { const g = s.slice(1).map((v,i)=>v-s[i]); return g.length ? this.median(g)||16 : 16; }
  private median(a: number[]): number { if (!a.length) return 0; const s = [...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; }
  private uid(): string { return `cg_${Date.now().toString(36)}_${Math.random().toString(36).substr(2,6)}`; }

// === الفجوات المفقودة من Part I ===

  // 1. Alignment dependencies encoding
  encodeAlignmentDependencies(elements: ConstraintNode[]): Array<{ source: string; target: string; axis: 'x' | 'y'; offset: number }> {
    const deps: Array<{ source: string; target: string; axis: 'x' | 'y'; offset: number }> = [];
    const SNAP = 4;
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i], b = elements[j];
        if (Math.abs(a.x - b.x) <= SNAP) deps.push({ source: a.id, target: b.id, axis: 'x', offset: b.x - a.x });
        if (Math.abs(a.y - b.y) <= SNAP) deps.push({ source: a.id, target: b.id, axis: 'y', offset: b.y - a.y });
        if (Math.abs((a.x + a.width) - (b.x + b.width)) <= SNAP) deps.push({ source: a.id, target: b.id, axis: 'x', offset: (b.x + b.width) - (a.x + a.width) });
      }
    }
    return deps;
  }

  // 2. Typography baseline relationships
  encodeTypographyBaselineRelationships(elements: ConstraintNode[]): Array<{ elementId: string; baseline: number; capHeight: number; ascenderRatio: number }> {
    return elements.filter(e => e.fontSize).map(e => ({
      elementId: e.id,
      baseline: e.y + (e.height || 0) * 0.82,
      capHeight: (e.fontSize || 12) * 0.7,
      ascenderRatio: (e.fontSize || 12) / (e.height || e.fontSize || 12),
    }));
  }

  // 3. Floating rounding drift prevention
  preventRoundingDrift(value: number, precision: number = 4): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  applyAntiDrift(elements: ConstraintNode[]): ConstraintNode[] {
    return elements.map(e => ({
      ...e,
      x: this.preventRoundingDrift(e.x),
      y: this.preventRoundingDrift(e.y),
      width: this.preventRoundingDrift(e.width),
      height: this.preventRoundingDrift(e.height),
    }));
  }

  // 4. Sub-pixel precision mode (0.01px for print-grade)
  enableSubPixelPrecision(elements: ConstraintNode[], enabled: boolean = true): ConstraintNode[] {
    const precision = enabled ? 2 : 0; // 0.01px vs 1px
    return elements.map(e => ({
      ...e,
      x: parseFloat(e.x.toFixed(precision)),
      y: parseFloat(e.y.toFixed(precision)),
      width: parseFloat(e.width.toFixed(precision)),
      height: parseFloat(e.height.toFixed(precision)),
    }));
  }

  // 5. STRICT and PROFESSIONAL mode gate
  solveForMode_DEPRECATED(elements: ConstraintNode[], mode: 'STRICT' | 'PROFESSIONAL'): { elements: ConstraintNode[]; constraintsSatisfied: number; total: number } {
    if (mode === 'STRICT') {
      // STRICT: apply anti-drift + sub-pixel + solve all constraints
      const drifted = this.applyAntiDrift(elements);
      const subpx = this.enableSubPixelPrecision(drifted, true);
      const result = this.solve(subpx);
      return { elements: result.nodes || subpx, constraintsSatisfied: result.satisfiedCount || 0, total: result.totalConstraints || 0 };
    }
    // PROFESSIONAL: solve normally, allow minor relaxation
    const result = this.solve(elements);
    return { elements: result.nodes || elements, constraintsSatisfied: result.satisfiedCount || 0, total: result.totalConstraints || 0 };
  }

  // Fix: solveForMode builds ConstraintGraph from ConstraintNode[] then calls solve()
  solveForModeFixed(elements: ConstraintNode[], mode: 'STRICT' | 'PROFESSIONAL'): { elements: ConstraintNode[]; constraintsSatisfied: number; total: number } {
    const prepared = mode === 'STRICT' ? this.enableSubPixelPrecision(this.applyAntiDrift(elements), true) : elements;
    const graph = this.build('system', prepared);
    const result = this.solve(graph);
    const outputNodes = [...(result.adjustedNodes?.values() || prepared)];
    return { elements: outputNodes, constraintsSatisfied: result.violations.length === 0 ? graph.edges.length : graph.edges.length - result.violations.length, total: graph.edges.length };
  }
}
