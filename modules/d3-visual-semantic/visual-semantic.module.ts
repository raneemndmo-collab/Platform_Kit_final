import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SemanticNode, HierarchyTree, ClassificationModel } from './domain/entities';
import { VisualSemanticModelService } from './application/services/visual-semantic.service';
import { VisualSemanticModelController } from './api/controllers/visual-semantic.controller';
import { ClassifyElementsHandler } from './application/commands/classify-elements.handler';
import { TrainClassifierHandler } from './application/commands/train-classifier.handler';
import { GetClassificationHandler } from './application/queries/get-classification.handler';
import { ListClassificationsHandler } from './application/queries/list-classifications.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([SemanticNode, HierarchyTree, ClassificationModel], 'd3_connection')],
  controllers: [VisualSemanticModelController],
  providers: [VisualSemanticModelService, ClassifyElementsHandler, TrainClassifierHandler, GetClassificationHandler, ListClassificationsHandler],
  exports: [VisualSemanticModelService],
})
export class VisualSemanticModelModule {}
