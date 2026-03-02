import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EventSchemaEntity, EventSubscriptionEntity,
  DeadLetterEventEntity, EventLogEntity,
} from './domain/entities';
import { K5EventBusService } from './application/handlers/event-bus.service';
import { K5EventBusController } from './api/controllers/event-bus.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventSchemaEntity,
      EventSubscriptionEntity,
      DeadLetterEventEntity,
      EventLogEntity,
    ], 'k5_connection'),
  ],
  controllers: [K5EventBusController],
  providers: [K5EventBusService],
  exports: [K5EventBusService],
})
export class K5EventBusModule {}
