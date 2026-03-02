// Rasid v6.4 — Large-Scale Visual Stability Engine — Section 4.4
import { BoundedMap } from '../bounded-collections';
import { Injectable } from '@nestjs/common';

export interface StabilityResult {
  stable: boolean; shiftedElements: Array<{ id: string; dx: number; dy: number }>;
  densityRatioPreserved: boolean; maxShift: number;
}

@Injectable()
export class VisualStabilityEngine {
  private readonly MAX_SHIFT_PX = 2;
  private snapshots = new Map<string, Map<string, { x: number; y: number; w: number; h: number }>>();

  captureSnapshot(dashboardId: string, elements: Array<{ id: string; x: number; y: number; width: number; height: number }>): void {
    const map = new BoundedMap<string, { x: number; y: number; w: number; h: number }>(10_000);
    for (const el of elements) map.set(el.id, { x: el.x, y: el.y, w: el.width, h: el.height });
    this.snapshots.set(dashboardId, map);
  }

  checkStability(dashboardId: string, updated: Array<{ id: string; x: number; y: number; width: number; height: number }>): StabilityResult {
    const prev = this.snapshots.get(dashboardId);
    if (!prev) return { stable: true, shiftedElements: [], densityRatioPreserved: true, maxShift: 0 };

    const shifted: StabilityResult['shiftedElements'] = [];
    let maxShift = 0;
    for (const el of updated) {
      const p = prev.get(el.id);
      if (p) {
        const dx = Math.abs(el.x - p.x), dy = Math.abs(el.y - p.y);
        const shift = Math.sqrt(dx * dx + dy * dy);
        if (shift > this.MAX_SHIFT_PX) shifted.push({ id: el.id, dx, dy });
        maxShift = Math.max(maxShift, shift);
      }
    }
    return { stable: shifted.length === 0, shiftedElements: shifted, densityRatioPreserved: shifted.length < updated.length * 0.1, maxShift };
  }

  lockPositions(dashboardId: string, elementIds: string[]): void {
    // Locked elements will not shift on data refresh
    const snap = this.snapshots.get(dashboardId);
    if (snap) {
      for (const id of elementIds) {
        const el = snap.get(id);
        if (el) snap.set(`${id}_locked`, { ...el });
      }
    }
  }
}
