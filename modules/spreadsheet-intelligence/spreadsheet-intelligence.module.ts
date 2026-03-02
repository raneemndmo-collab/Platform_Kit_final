import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpreadsheetIntelligenceService } from './application/services/spreadsheet-intelligence.service';
import { SpreadsheetIntelligenceController } from './api/controllers/spreadsheet-intelligence.controller';
import { FormulaAnalysis, SpreadsheetPattern, PivotReconstruction, PrecisionCheck } from './domain/entities';
@Module({
  imports: [TypeOrmModule.forFeature([FormulaAnalysis, SpreadsheetPattern, PivotReconstruction, PrecisionCheck], 'sheetintel_connection')],
  controllers: [SpreadsheetIntelligenceController],
  providers: [SpreadsheetIntelligenceService],
  exports: [SpreadsheetIntelligenceService],
})
export class SpreadsheetIntelligenceModule {}
