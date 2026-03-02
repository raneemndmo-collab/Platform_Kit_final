// Rasid v6.4 — Visual Density Preserving Sampling — Part X
import { Injectable } from '@nestjs/common';


@Injectable()

// Extended: Visual shape integrity preservation
export interface SamplingResult {
  sampledData: number[]; method: 'lttb' | 'min_max' | 'average' | 'none';
  originalSize: number; sampledSize: number; compressionRatio: number;
  shapeIntegrity: number; distributionPreserved: boolean;
}

export class DensityPreservingSampler {
  /**
   * Largest Triangle Three Buckets (LTTB) algorithm
   * Preserves visual shape much better than naive downsampling
   */
  lttb(data: number[], targetSize: number): SamplingResult {
    if (data.length <= targetSize) return { sampledData: data, method: 'none', originalSize: data.length, sampledSize: data.length, compressionRatio: 1, shapeIntegrity: 1, distributionPreserved: true };

    const sampled: number[] = [data[0]];
    const bucketSize = (data.length - 2) / (targetSize - 2);

    let prevSelected = 0;
    for (let i = 0; i < targetSize - 2; i++) {
      const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
      const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1);
      const nextBucketStart = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1);
      const nextBucketEnd = Math.min(Math.floor((i + 3) * bucketSize) + 1, data.length);

      let nextAvg = 0;
      for (let j = nextBucketStart; j < nextBucketEnd; j++) nextAvg += data[j];
      nextAvg /= Math.max(nextBucketEnd - nextBucketStart, 1);

      let maxArea = -1, maxIdx = bucketStart;
      for (let j = bucketStart; j < bucketEnd; j++) {
        const area = Math.abs((prevSelected - nextBucketStart) * (data[j] - data[prevSelected]) - (prevSelected - j) * (nextAvg - data[prevSelected]));
        if (area > maxArea) { maxArea = area; maxIdx = j; }
      }
      sampled.push(data[maxIdx]);
      prevSelected = maxIdx;
    }
    sampled.push(data[data.length - 1]);

    return {
      sampledData: sampled, method: 'lttb', originalSize: data.length,
      sampledSize: sampled.length, compressionRatio: data.length / sampled.length,
      shapeIntegrity: this.computeShapeIntegrity(data, sampled),
      distributionPreserved: this.checkDistribution(data, sampled),
    };
  }

  private computeShapeIntegrity(original: number[], sampled: number[]): number {
    const origMin = Math.min(...original), origMax = Math.max(...original);
    const sampMin = Math.min(...sampled), sampMax = Math.max(...sampled);
    const rangePreservation = 1 - Math.abs((origMax - origMin) - (sampMax - sampMin)) / Math.max(origMax - origMin, 1);
    return Math.max(0, Math.min(1, rangePreservation));
  }

  private checkDistribution(original: number[], sampled: number[]): boolean {
    const origMean = original.reduce((s, v) => s + v, 0) / original.length;
    const sampMean = sampled.reduce((s, v) => s + v, 0) / sampled.length;
    return Math.abs(origMean - sampMean) / Math.max(Math.abs(origMean), 1) < 0.05;
  }

// GAP-13: Preserve histogram continuity
  validateHistogramContinuity(original: number[], sampled: number[], binCount: number = 20): { continuous: boolean; maxBinDeviation: number; bins: Array<{ binStart: number; origCount: number; sampledCount: number; deviation: number }> } {
    const min = Math.min(...original), max = Math.max(...original);
    const binW = (max - min) / binCount;
    const bins = Array.from({ length: binCount }, (_, i) => {
      const binStart = min + i * binW;
      const binEnd = binStart + binW;
      // FIX A2: Use pre-computed histogram buckets (O(n) total instead of O(n*bins))
      const origCount = origHistogram[i] / original.length;
      const sampledCount = sampledHistogram[i] / (sampled.length || 1);
      return { binStart, origCount, sampledCount, deviation: Math.abs(origCount - sampledCount) };
    });
    const maxDev = Math.max(...bins.map(b => b.deviation));
    return { continuous: maxDev < 0.1, maxBinDeviation: maxDev, bins };
  }

  // GAP-13: Preserve line slope continuity
  validateSlopeContinuity(original: Array<{ x: number; y: number }>, sampled: Array<{ x: number; y: number }>): { continuous: boolean; maxSlopeDeviation: number; segments: Array<{ segmentIdx: number; origSlope: number; sampledSlope: number; deviation: number }> } {
    const calcSlopes = (pts: Array<{ x: number; y: number }>): number[] => {
      const slopes: number[] = [];
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        slopes.push(dx !== 0 ? (pts[i].y - pts[i - 1].y) / dx : 0);
      }
      return slopes;
    };
    const origSlopes = calcSlopes(original);
    const sampledSlopes = calcSlopes(sampled);
    const segments: Array<{ segmentIdx: number; origSlope: number; sampledSlope: number; deviation: number }> = [];
    const step = Math.max(1, Math.floor(origSlopes.length / (sampledSlopes.length || 1)));
    for (let i = 0; i < sampledSlopes.length && i * step < origSlopes.length; i++) {
      const origS = origSlopes[i * step];
      const sampS = sampledSlopes[i];
      const maxS = Math.max(Math.abs(origS), Math.abs(sampS), 0.001);
      segments.push({ segmentIdx: i, origSlope: origS, sampledSlope: sampS, deviation: Math.abs(origS - sampS) / maxS });
    }
    const maxDev = segments.length > 0 ? Math.max(...segments.map(s => s.deviation)) : 0;
    return { continuous: maxDev < 0.15, maxSlopeDeviation: maxDev, segments };
  }
}
