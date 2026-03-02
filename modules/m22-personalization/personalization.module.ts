import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile, UserActivityHistory, RecommendationItem } from './domain/entities';
import { PersonalizationService } from './application/services/personalization.service';
import { PersonalizationController } from './api/controllers/personalization.controller';
import { RecordInteractionHandler } from './application/commands/record-interaction.handler';
import { UpdateProfileHandler } from './application/commands/update-profile.handler';
import { GetRecommendationsHandler } from './application/queries/get-recommendations.handler';
import { GetProfileHandler } from './application/queries/get-profile.handler';
@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([UserProfile, UserActivityHistory, RecommendationItem], 'm22_connection')],
  controllers: [PersonalizationController],
  providers: [PersonalizationService, RecordInteractionHandler, UpdateProfileHandler, GetRecommendationsHandler, GetProfileHandler],
  exports: [PersonalizationService],
})
export class PersonalizationModule {}
