// ═══════════════════════════════════════════════════════════════════════════════
// محرك الرسم المعرفي — Knowledge Graph Engine
// رصيد v6.4 — بناء وتحليل العلاقات مع عزل المستأجر
// ═══════════════════════════════════════════════════════════════════════════════
import { Injectable, Logger } from '@nestjs/common';
import { BoundedMap } from '../../bounded-collections';

export interface GraphNode {
  id: string;
  tenantId: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  createdAt: Date;
}

export interface GraphEdge {
  id: string;
  tenantId: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths?: GraphNode[][];
  metrics?: { nodeCount: number; edgeCount: number; density: number; avgDegree: number };
}

@Injectable()
export class KnowledgeGraphEngine {
  private readonly logger = new Logger(KnowledgeGraphEngine.name);
  private readonly nodes = new BoundedMap<string, GraphNode[]>(50000);
  private readonly edges = new BoundedMap<string, GraphEdge[]>(100000);

  addNode(node: GraphNode): GraphNode {
    this.logger.debug(`إضافة عقدة: ${node.label} tenant=${node.tenantId}`);
    const tenantNodes = this.nodes.get(node.tenantId) || [];
    tenantNodes.push(node);
    this.nodes.set(node.tenantId, tenantNodes);
    return node;
  }

  addEdge(edge: GraphEdge): GraphEdge {
    const tenantEdges = this.edges.get(edge.tenantId) || [];
    tenantEdges.push(edge);
    this.edges.set(edge.tenantId, tenantEdges);
    return edge;
  }

  query(tenantId: string, nodeType?: string, limit = 100): GraphQueryResult {
    const allNodes = (this.nodes.get(tenantId) || []);
    const filteredNodes = nodeType ? allNodes.filter(n => n.type === nodeType) : allNodes;
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const allEdges = (this.edges.get(tenantId) || []);
    const filteredEdges = allEdges.filter(e => nodeIds.has(e.sourceId) || nodeIds.has(e.targetId));

    return {
      nodes: filteredNodes.slice(0, limit),
      edges: filteredEdges.slice(0, limit * 2),
      metrics: {
        nodeCount: filteredNodes.length,
        edgeCount: filteredEdges.length,
        density: filteredNodes.length > 1 ? filteredEdges.length / (filteredNodes.length * (filteredNodes.length - 1)) : 0,
        avgDegree: filteredNodes.length > 0 ? (filteredEdges.length * 2) / filteredNodes.length : 0,
      },
    };
  }

  findShortestPath(tenantId: string, sourceId: string, targetId: string): GraphNode[] {
    const allNodes = this.nodes.get(tenantId) || [];
    const allEdges = this.edges.get(tenantId) || [];
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const adjacency = new Map<string, string[]>();
    for (const edge of allEdges) {
      adjacency.set(edge.sourceId, [...(adjacency.get(edge.sourceId) || []), edge.targetId]);
      adjacency.set(edge.targetId, [...(adjacency.get(edge.targetId) || []), edge.sourceId]);
    }

    // BFS
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === targetId) {
        return current.path.map(id => nodeMap.get(id)!).filter(Boolean);
      }
      for (const neighbor of adjacency.get(current.id) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
    return [];
  }

  getRelatedNodes(tenantId: string, nodeId: string, depth = 1): GraphNode[] {
    const allEdges = this.edges.get(tenantId) || [];
    const allNodes = this.nodes.get(tenantId) || [];
    const nodeMap = new Map(allNodes.map(n => [n.id, n]));
    const visited = new Set<string>([nodeId]);
    let frontier = [nodeId];

    for (let d = 0; d < depth; d++) {
      const nextFrontier: string[] = [];
      for (const id of frontier) {
        for (const edge of allEdges) {
          const neighbor = edge.sourceId === id ? edge.targetId : edge.targetId === id ? edge.sourceId : null;
          if (neighbor && !visited.has(neighbor)) {
            visited.add(neighbor);
            nextFrontier.push(neighbor);
          }
        }
      }
      frontier = nextFrontier;
    }

    visited.delete(nodeId);
    return [...visited].map(id => nodeMap.get(id)!).filter(Boolean);
  }
}
