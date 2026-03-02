import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArabicAiEngineEntity } from './domain/entities/arabic_ai_engine.entity';
import { ArabicAiEngineRepository } from './infrastructure/repositories/arabic_ai_engine.repository';
import { ArabicAiEngineService } from './application/services/arabic_ai_engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([ArabicAiEngineEntity], 'arabic_ai_engine_connection')],
  providers: [ArabicAiEngineService, ArabicAiEngineRepository],
  exports: [ArabicAiEngineService],
})
export class ArabicAiEngineModule {}
