import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpreadsheetIntelligenceEntity } from './domain/entities/spreadsheet_intelligence.entity';
import { SpreadsheetIntelligenceRepository } from './infrastructure/repositories/spreadsheet_intelligence.repository';
import { SpreadsheetIntelligenceService } from './application/services/spreadsheet_intelligence.service';

@Module({
  imports: [TypeOrmModule.forFeature([SpreadsheetIntelligenceEntity], 'spreadsheet_intelligence_connection')],
  providers: [SpreadsheetIntelligenceService, SpreadsheetIntelligenceRepository],
  exports: [SpreadsheetIntelligenceService],
})
export class SpreadsheetIntelligenceModule {}
