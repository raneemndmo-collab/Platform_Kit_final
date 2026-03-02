// Rasid v6.4 — RLS Middleware — SEC-004 Fix
// Sets tenant context for Row-Level Security
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RLSMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RLSMiddleware.name);

  constructor(private readonly dataSource: DataSource) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = (req as any).tenantContext?.tenantId;
    const isAdmin = (req as any).user?.roles?.includes('SUPER_ADMIN') || false;

    if (tenantId) {
      try {
        // Set PostgreSQL session variables for RLS
        await this.dataSource.query(
          `SET LOCAL app.current_tenant_id = $1; SET LOCAL app.is_admin = $2;`,
          [tenantId, isAdmin.toString()]
        );
      } catch (error) {
        this.logger.error(`Failed to set RLS context: ${error}`);
      }
    }

    next();
  }
}
