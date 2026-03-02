import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification, NotificationPreference, NotificationTemplate } from './domain/entities';
import { NotificationService } from './application/services/notification.service';
import { NotificationController } from './api/controllers/notification.controller';
import { MarkReadHandler } from './application/commands/mark-read.handler';
import { SendNotificationHandler } from './application/commands/send-notification.handler';
import { ListNotificationsHandler } from './application/queries/list-notifications.handler';
import { GetNotificationHandler } from './application/queries/get-notification.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([Notification, NotificationPreference, NotificationTemplate], 'm20_connection')],
  controllers: [NotificationController],
  providers: [NotificationService, MarkReadHandler, SendNotificationHandler, ListNotificationsHandler, GetNotificationHandler],
  exports: [NotificationService],
})
export class NotificationModule {}
