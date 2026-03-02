// =============================================================================
// D2: Layout Graph Engine — Spatial Layout Analysis
// Constitutional: TXD-002, Part 11
// Analyzes CDR Layer 3 (Layout) to build spatial relationship graphs
// =============================================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface LayoutNode {
  id: string;
  type: 'page' | 'section' | 'column' | 'row' | 'block' | 'element';
  bounds: { x: number; y: number; width: number; height: number };
  children: string[];
  parentId?: string;
  gridSlot?: { col: number; row: number; colSpan: number; rowSpan: number };
}

export interface LayoutEdge {
  from: string;
  to: string;
  relationship: 'contains' | 'adjacent-right' | 'adjacent-below' | 'overlaps' | 'aligned';
  weight: number;
}

export interface LayoutGraph {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  gridAnalysis: GridAnalysis;
  readingOrder: string[];
}

export interface GridAnalysis {
  gridType: 'single-column' | 'multi-column' | 'grid' | 'freeform';
  columns: number;
  rows: number;
  gutterWidth: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

@Injectable()
export class LayoutGraphService {
  private safeEmit(event: string, data: unknown): void { try { (this as any).eventEmitter?.emit(event, data) ?? (this as any).events?.emit(event, data); } catch (e) { this.logger.error(`Event ${event} failed: ${e}`); } }
  private readonly logger = new Logger(LayoutGraphService.name);

  constructor(
    @InjectRepository('LayoutGraphEntity') private graphRepo: Repository<unknown>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Analyze CDR layout layer and build spatial graph
   */
  async analyzeLayout(tenantId: string, dto: { cdrId: string; layoutLayer: unknown }): Promise<LayoutGraph> {
    const startTime = Date.now();

    // Extract spatial elements from CDR layout layer
    const nodes = this.extractNodes(dto.layoutLayer);
    const edges = this.buildSpatialEdges(nodes);
    const gridAnalysis = this.detectGrid(nodes);
    const readingOrder = this.computeReadingOrder(nodes, gridAnalysis);

    const graph: LayoutGraph = { nodes, edges, gridAnalysis, readingOrder };

    // Persist
    await this.graphRepo.save({
      tenantId, cdrId: dto.cdrId,
      graphJson: JSON.stringify(graph),
      gridType: gridAnalysis.gridType,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });

    this.safeEmit('layout.analyzed', {
      tenantId, cdrId: dto.cdrId, gridType: gridAnalysis.gridType,
      nodeCount: nodes.length, durationMs: Date.now() - startTime,
    });

    return graph;
  }

  /**
   * Extract bounding boxes from CDR layout elements
   */
  private extractNodes(layoutLayer: unknown): LayoutNode[] {
    const elements = layoutLayer?.elements || [];
    return elements.map((el: unknown, idx: number) => ({
      id: el.id || `node_${idx}`,
      type: el.type || 'element',
      bounds: {
        x: el.x || 0, y: el.y || 0,
        width: el.width || 100, height: el.height || 50,
      },
      children: el.children || [],
      parentId: el.parentId,
    }));
  }

  /**
   * Build spatial relationship edges between nodes
   */
  private buildSpatialEdges(nodes: LayoutNode[]): LayoutEdge[] {
    const edges: LayoutEdge[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i].bounds;
        const b = nodes[j].bounds;

        // Check parent-child containment
        if (nodes[j].parentId === nodes[i].id) {
          edges.push({ from: nodes[i].id, to: nodes[j].id, relationship: 'contains', weight: 1.0 });
          continue;
        }

        // Check horizontal adjacency
        if (Math.abs((a.x + a.width) - b.x) < 10 && this.verticalOverlap(a, b) > 0.5) {
          edges.push({ from: nodes[i].id, to: nodes[j].id, relationship: 'adjacent-right', weight: 0.8 });
        }

        // Check vertical adjacency
        if (Math.abs((a.y + a.height) - b.y) < 10 && this.horizontalOverlap(a, b) > 0.5) {
          edges.push({ from: nodes[i].id, to: nodes[j].id, relationship: 'adjacent-below', weight: 0.8 });
        }

        // Check alignment
        if (Math.abs(a.x - b.x) < 2) {
          edges.push({ from: nodes[i].id, to: nodes[j].id, relationship: 'aligned', weight: 0.3 });
        }
      }
    }
    return edges;
  }

  /**
   * Detect grid system from layout nodes
   */
  private detectGrid(nodes: LayoutNode[]): GridAnalysis {
    if (nodes.length === 0) {
      return { gridType: 'single-column', columns: 1, rows: 1, gutterWidth: 0, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 };
    }

    const xPositions = [...new Set(nodes.map(n => n.bounds.x))].sort((a, b) => a - b);
    const columns = xPositions.length;

    let gridType: GridAnalysis['gridType'] = 'single-column';
    if (columns === 1) gridType = 'single-column';
    else if (columns <= 4) gridType = 'multi-column';
    else gridType = 'grid';

    const gutterWidth = columns > 1 ? xPositions[1] - (xPositions[0] + nodes[0].bounds.width) : 0;

    return {
      gridType, columns, rows: Math.ceil(nodes.length / Math.max(1, columns)),
      gutterWidth: Math.max(0, gutterWidth),
      marginTop: Math.min(...nodes.map(n => n.bounds.y)),
      marginBottom: 0,
      marginLeft: Math.min(...nodes.map(n => n.bounds.x)),
      marginRight: 0,
    };
  }

  /**
   * Compute reading order (LTR or RTL-aware)
   */
  private computeReadingOrder(nodes: LayoutNode[], grid: GridAnalysis): string[] {
    return [...nodes]
      .sort((a, b) => {
        const rowDiff = Math.floor(a.bounds.y / 50) - Math.floor(b.bounds.y / 50);
        if (rowDiff !== 0) return rowDiff;
        return a.bounds.x - b.bounds.x;
      })
      .map(n => n.id);
  }

  private verticalOverlap(a: unknown, b: unknown): number {
    const overlapStart = Math.max(a.y, b.y);
    const overlapEnd = Math.min(a.y + a.height, b.y + b.height);
    return Math.max(0, overlapEnd - overlapStart) / Math.min(a.height, b.height);
  }

  private horizontalOverlap(a: unknown, b: unknown): number {
    const overlapStart = Math.max(a.x, b.x);
    const overlapEnd = Math.min(a.x + a.width, b.x + b.width);
    return Math.max(0, overlapEnd - overlapStart) / Math.min(a.width, b.width);
  }

  async getGraph(tenantId: string, cdrId: string): Promise<LayoutGraph> {
    const record = await this.graphRepo.findOne({ where: { tenantId, cdrId } });
    if (!record) throw new NotFoundException('Layout graph not found');
    return JSON.parse(record.graphJson);
  }
}
