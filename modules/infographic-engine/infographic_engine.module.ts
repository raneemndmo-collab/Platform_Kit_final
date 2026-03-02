import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfographicEngineEntity } from './domain/entities/infographic_engine.entity';
import { InfographicEngineRepository } from './infrastructure/repositories/infographic_engine.repository';
import { InfographicEngineService } from './application/services/infographic_engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([InfographicEngineEntity], 'infographic_engine_connection')],
  providers: [InfographicEngineService, InfographicEngineRepository],
  exports: [InfographicEngineService],
})
export class InfographicEngineModule {}
