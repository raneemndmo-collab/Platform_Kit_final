import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiCognitiveEntity } from './domain/entities/bi_cognitive.entity';
import { BiCognitiveRepository } from './infrastructure/repositories/bi_cognitive.repository';
import { BiCognitiveService } from './application/services/bi_cognitive.service';

@Module({
  imports: [TypeOrmModule.forFeature([BiCognitiveEntity], 'bi_cognitive_connection')],
  providers: [BiCognitiveService, BiCognitiveRepository],
  exports: [BiCognitiveService],
})
export class BiCognitiveModule {}
