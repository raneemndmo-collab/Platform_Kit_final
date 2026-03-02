// =============================================================================
// K6: Notification Module
// Database: notification_db (exclusive) | Event Namespace: notify.*
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  NotificationTemplateEntity, NotificationDeliveryEntity, NotificationPreferenceEntity,
} from './domain/entities';
import { K6NotificationService } from './application/handlers/notification.service';
import { NotificationController } from './api/controllers/notification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationTemplateEntity,
      NotificationDeliveryEntity,
      NotificationPreferenceEntity,
    ], 'k6_connection'),
  ],
  controllers: [NotificationController],
  providers: [K6NotificationService],
  exports: [K6NotificationService],
})
export class K6NotificationModule {}
