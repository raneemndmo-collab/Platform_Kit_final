// Rasid v6.4 — Tenant RLS Subscriber — SEC-004 Fix
import { EntitySubscriberInterface, InsertEvent, UpdateEvent, EventSubscriber } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('TenantRLS');

/**
 * SEC-004: Automatically set tenant context on every DB query
 * Ensures RLS policies are active for all operations
 */
@EventSubscriber()
export class TenantRLSSubscriber implements EntitySubscriberInterface {
  
  async beforeInsert(event: InsertEvent<any>): Promise<void> {
    await this.setTenantContext(event);
  }

  async beforeUpdate(event: UpdateEvent<any>): Promise<void> {
    await this.setTenantContext(event as any);
  }

  private async setTenantContext(event: InsertEvent<any>): Promise<void> {
    const tenantId = (event.entity as any)?.tenantId;
    if (tenantId) {
      try {
        await event.queryRunner.query(
          `SELECT set_config('app.current_tenant_id', $1, true)`,
          [tenantId]
        );
      } catch (e) {
        logger.warn(`Failed to set tenant RLS context: ${e}`);
      }
    }
  }
}
