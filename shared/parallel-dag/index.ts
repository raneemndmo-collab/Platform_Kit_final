// Rasid v6.4 — Parallel DAG Optimizer — Part VII
import { BoundedMap } from '../bounded-collections';
import { Injectable } from '@nestjs/common';

export interface DAGNode { id: string; formula: string; dependencies: string[]; result?: unknown; partition?: number; }
export interface DAGPartition { id: number; nodes: DAGNode[]; canParallelize: boolean; }
export interface ParallelPlan { partitions: DAGPartition[]; maxParallelism: number; estimatedSpeedup: number; deterministicOrder: string[]; }

@Injectable()
export class ParallelDAGOptimizer {
  analyze(nodes: DAGNode[]): ParallelPlan {
    const levels = this.topologicalLevels(nodes);
    const partitions: DAGPartition[] = levels.map((level, i) => ({
      id: i, nodes: level, canParallelize: level.length > 1,
    }));
    const maxParallelism = Math.max(...partitions.map(p => p.nodes.length));
    const serialSteps = partitions.length;
    const avgWidth = nodes.length / serialSteps;
    const estimatedSpeedup = Math.min(maxParallelism, avgWidth);
    const deterministicOrder = partitions.flatMap(p => p.nodes.map(n => n.id));

    return { partitions, maxParallelism, estimatedSpeedup, deterministicOrder };
  }

  async executeParallel(plan: ParallelPlan, executor: (node: DAGNode) => Promise<unknown>): Promise<Map<string, unknown>> {
    const results = new BoundedMap<string, unknown>(10_000);
    for (const partition of plan.partitions) {
      if (partition.canParallelize) {
        const batchResults = await Promise.all(partition.nodes.map(n => executor(n)));
        partition.nodes.forEach((n, i) => results.set(n.id, batchResults[i]));
      } else {
        for (const node of partition.nodes) { results.set(node.id, await executor(node)); }
      }
    }
    return results;
  }

  private topologicalLevels(nodes: DAGNode[]): DAGNode[][] {
    const inDegree = new BoundedMap<string, number>(10_000);
    const adjList = new BoundedMap<string, string[]>(10_000);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const n of nodes) { inDegree.set(n.id, n.dependencies.reduce((c: number, d: string) => c + (nodeMap.has(d) ? 1 : 0), 0)); adjList.set(n.id, []); }
    for (const n of nodes) { for (const dep of n.dependencies) { if (adjList.has(dep)) adjList.get(dep)!.push(n.id); } }

    const levels: DAGNode[][] = [];
    let queue = nodes.filter(n => (inDegree.get(n.id) || 0) === 0);

    while (queue.length > 0) {
      levels.push(queue);
      const next: DAGNode[] = [];
      for (const node of queue) {
        for (const child of adjList.get(node.id) || []) {
          inDegree.set(child, (inDegree.get(child) || 1) - 1);
          if (inDegree.get(child) === 0) { const cn = nodeMap.get(child); if (cn) next.push(cn); }
        }
      }
      queue = next;
    }
    return levels;
  }

// GAP-12: Race condition prevention via execution locks
  private executionLock = new BoundedMap<string, boolean>(10_000);

  async executeWithLock<T>(partitionId: string, fn: () => Promise<T>): Promise<T> {
    while (this.executionLock.get(partitionId)) {
      await new Promise(resolve => setTimeout(resolve, 1));
    }
    this.executionLock.set(partitionId, true);
    try {
      return await fn();
    } finally {
      this.executionLock.delete(partitionId);
    }
  }

  // GAP-12: Numeric precision ceiling — detect and flag precision loss
  validateNumericPrecision(results: Array<{ nodeId: string; value: number }>): Array<{ nodeId: string; value: number; precisionIssue: boolean; decimalPlaces: number }> {
    return results.map(r => {
      const str = r.value.toString();
      const decParts = str.split('.');
      const decimalPlaces = decParts.length > 1 ? decParts[1].length : 0;
      const precisionIssue = decimalPlaces > 10 || !Number.isFinite(r.value) || (Math.abs(r.value) > 0 && Math.abs(r.value) < 1e-15);
      return { nodeId: r.nodeId, value: r.value, precisionIssue, decimalPlaces };
    });
  }

  // Safe parallel execution with lock + precision check
  async executeSafeParallel(partitions: string[][], evaluator: (nodeId: string) => Promise<number>): Promise<Array<{ nodeId: string; value: number; precisionIssue: boolean }>> {
    const allResults: Array<{ nodeId: string; value: number }> = [];
    for (const partition of partitions) {
      const partResults = await Promise.all(
        partition.map(nodeId => this.executeWithLock(nodeId, async () => {
          const value = await evaluator(nodeId);
          return { nodeId, value };
        }))
      );
      allResults.push(...partResults);
    }
    return this.validateNumericPrecision(allResults);
  }
}
