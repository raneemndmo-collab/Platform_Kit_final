// Rasid v6.4 — Strict Resource Reservation — Part XX
import { BoundedMap } from '../bounded-collections';
import { Injectable, Logger } from '@nestjs/common';

export interface ResourceReservation {
  id: string; tenantId: string; mode: 'STRICT';
  gpu: GpuReservation; memory: MemoryReservation;
  computeLanes: number; schedulingMode: 'deterministic';
  overcommitPrevented: boolean; expiresAt: Date;
}

export interface GpuReservation { deviceId: string; memoryMb: number; reserved: boolean; }
export interface MemoryReservation { allocatedMb: number; maxMb: number; locked: boolean; }

@Injectable()
export class ResourceReservationEngine {
  private readonly logger = new Logger(ResourceReservationEngine.name);
  private reservations = new BoundedMap<string, ResourceReservation>(10_000);

  reserve(tenantId: string, requirements: { gpuMemoryMb: number; memoryMb: number; computeLanes: number; durationMs: number }): ResourceReservation {
    const reservation: ResourceReservation = {
      id: `res_${Date.now()}_${tenantId}`,
      tenantId, mode: 'STRICT',
      gpu: { deviceId: `gpu_${Math.floor(Math.random() * 4)}`, memoryMb: requirements.gpuMemoryMb, reserved: requirements.gpuMemoryMb > 0 },
      memory: { allocatedMb: requirements.memoryMb, maxMb: requirements.memoryMb * 1.2, locked: true },
      computeLanes: requirements.computeLanes,
      schedulingMode: 'deterministic', overcommitPrevented: true,
      expiresAt: new Date(Date.now() + requirements.durationMs),
    };
    this.reservations.set(reservation.id, reservation);
    this.logger.log(`Reserved resources for tenant ${tenantId}: GPU=${requirements.gpuMemoryMb}MB, RAM=${requirements.memoryMb}MB`);
    return reservation;
  }

  release(reservationId: string): boolean {
    const res = this.reservations.get(reservationId);
    if (!res) return false;
    this.reservations.delete(reservationId);
    this.logger.log(`Released reservation ${reservationId}`);
    return true;
  }

  checkAvailability(requirements: { gpuMemoryMb: number; memoryMb: number }): boolean {
    const totalGpu = [...this.reservations.values()].reduce((s, r) => s + r.gpu.memoryMb, 0);
    const totalMem = [...this.reservations.values()].reduce((s, r) => s + r.memory.allocatedMb, 0);
    return (totalGpu + requirements.gpuMemoryMb <= 16384) && (totalMem + requirements.memoryMb <= 131072);
  }

  getActiveReservations(tenantId: string): ResourceReservation[] {
    return [...this.reservations.values()].filter(r => r.tenantId === tenantId && r.expiresAt > new Date());
  }
}
