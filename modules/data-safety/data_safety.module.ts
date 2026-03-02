import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSafetyEntity } from './domain/entities/data_safety.entity';
import { DataSafetyRepository } from './infrastructure/repositories/data_safety.repository';
import { DataSafetyService } from './application/services/data_safety.service';

@Module({
  imports: [TypeOrmModule.forFeature([DataSafetyEntity], 'data_safety_connection')],
  providers: [DataSafetyService, DataSafetyRepository],
  exports: [DataSafetyService],
})
export class DataSafetyModule {}
