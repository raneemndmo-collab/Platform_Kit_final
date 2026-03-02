// M25-FILE-STORAGE: CreateUpload Command (CQRS — Part 2)
import { BaseCommand } from '../../../../shared/cqrs';

export class CreateUploadCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly filename: string,
    public readonly mimeType: string,
    public readonly sizeBytes: string,
    public readonly storagePath: string,
  ) {
    super(tenantId, userId);
  }
}

export class UpdateUploadCommand extends BaseCommand {
  constructor(
    tenantId: string,
    userId: string,
    public readonly id: string,
    public readonly updates: Partial<{ filename: string; mimeType: string; sizeBytes: string; storagePath: string }>,
  ) {
    super(tenantId, userId);
  }
}

export class DeleteUploadCommand extends BaseCommand {
  constructor(tenantId: string, userId: string, public readonly id: string) {
    super(tenantId, userId);
  }
}
