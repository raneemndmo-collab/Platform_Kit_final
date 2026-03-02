import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationChannel, CollaborationMessage, CollaborationPresence } from './domain/entities';
import { CollaborationService } from './application/services/collaboration.service';
import { CollaborationController } from './api/controllers/collaboration.controller';
import { CreateSpaceHandler } from './application/commands/create-space.handler';
import { AddMemberHandler } from './application/commands/add-member.handler';
import { ListSpacesHandler } from './application/queries/list-spaces.handler';
import { GetSpaceHandler } from './application/queries/get-space.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([CollaborationChannel, CollaborationMessage, CollaborationPresence], 'm23_connection')],
  controllers: [CollaborationController],
  providers: [CollaborationService, CreateSpaceHandler, AddMemberHandler, ListSpacesHandler, GetSpaceHandler],
  exports: [CollaborationService],
})
export class CollaborationModule {}
