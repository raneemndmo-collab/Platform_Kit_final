// Rasid v6.4 — Visual Balance Correction Engine — Section 6.2
import { Injectable } from '@nestjs/common';

export interface BalanceCorrectionResult {
  balanced: boolean; corrections: Array<{ elementId: string; adjustment: { dx: number; dy: number; dw: number; dh: number } }>;
  symmetryScore: number; densityDistribution: { TL: number; TR: number; BL: number; BR: number };
}

@Injectable()
export class VisualBalanceCorrectionEngine {
  correct(elements: Array<{ id: string; x: number; y: number; width: number; height: number; weight: number }>, canvas: { width: number; height: number }): BalanceCorrectionResult {
    const midX = canvas.width / 2, midY = canvas.height / 2;
    const quadrants = { TL: 0, TR: 0, BL: 0, BR: 0 };
    const corrections: BalanceCorrectionResult['corrections'] = [];

    for (const el of elements) {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
      const area = el.width * el.height * el.weight;
      if (cx <= midX && cy <= midY) quadrants.TL += area;
      else if (cx > midX && cy <= midY) quadrants.TR += area;
      else if (cx <= midX && cy > midY) quadrants.BL += area;
      else quadrants.BR += area;
    }

    const total = Object.values(quadrants).reduce((s, v) => s + v, 0) || 1;
    const density = { TL: quadrants.TL / total, TR: quadrants.TR / total, BL: quadrants.BL / total, BR: quadrants.BR / total };
    const maxDev = Math.max(...Object.values(density).map(v => Math.abs(v - 0.25)));

    if (maxDev > 0.15) {
      const heaviest = Object.entries(density).sort((a, b) => b[1] - a[1])[0][0];
      const lightest = Object.entries(density).sort((a, b) => a[1] - b[1])[0][0];
      for (const el of elements) {
        const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
        const q = cx <= midX ? (cy <= midY ? 'TL' : 'BL') : (cy <= midY ? 'TR' : 'BR');
        if (q === heaviest) {
          const dx = lightest.includes('R') ? 10 : lightest.includes('L') ? -10 : 0;
          const dy = lightest.includes('B') ? 10 : lightest.includes('T') ? -10 : 0;
          corrections.push({ elementId: el.id, adjustment: { dx, dy, dw: 0, dh: 0 } });
        }
      }
    }

    const symmetry = 1 - maxDev * 2;
    return { balanced: maxDev <= 0.15, corrections, symmetryScore: Math.max(0, symmetry), densityDistribution: density };
  }

// GAP-27: Active redistribution — move elements to balance quadrants
  redistribute(elements: Array<{ id: string; x: number; y: number; width: number; height: number; weight?: number }>, canvasW: number, canvasH: number): Array<{ id: string; dx: number; dy: number; reason: string }> {
    const midX = canvasW / 2, midY = canvasH / 2;
    const quadrants = [0, 0, 0, 0]; // TL, TR, BL, BR
    for (const el of elements) {
      const qx = (el.x + el.width / 2) < midX ? 0 : 1;
      const qy = (el.y + el.height / 2) < midY ? 0 : 1;
      quadrants[qy * 2 + qx] += (el.weight || 1) * el.width * el.height;
    }
    const total = quadrants.reduce((s, q) => s + q, 0) || 1;
    const ideal = total / 4;
    const moves: Array<{ id: string; dx: number; dy: number; reason: string }> = [];

    // Find overcrowded quadrant and move lightest elements toward empty quadrant
    const heaviestQ = quadrants.indexOf(Math.max(...quadrants));
    const lightestQ = quadrants.indexOf(Math.min(...quadrants));
    if (quadrants[heaviestQ] / total > 0.4) {
      const targetX = (lightestQ % 2) * midX + midX / 2;
      const targetY = Math.floor(lightestQ / 2) * midY + midY / 2;
      const overflowEls = elements.filter(el => {
        const qx = (el.x + el.width / 2) < midX ? 0 : 1;
        const qy = (el.y + el.height / 2) < midY ? 0 : 1;
        return (qy * 2 + qx) === heaviestQ;
      }).sort((a, b) => (a.weight || 1) - (b.weight || 1));

      const toMove = overflowEls.slice(0, Math.ceil(overflowEls.length * 0.3));
      for (const el of toMove) {
        const dx = (targetX - (el.x + el.width / 2)) * 0.3;
        const dy = (targetY - (el.y + el.height / 2)) * 0.3;
        moves.push({ id: el.id, dx: Math.round(dx), dy: Math.round(dy), reason: `Rebalance from Q${heaviestQ} toward Q${lightestQ}` });
      }
    }
    return moves;
  }
}
