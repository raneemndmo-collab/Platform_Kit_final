import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FontFamily, ShapingRule, FallbackLadder } from './domain/entities';
import { TypographyEngineService } from './application/services/typography-engine.service';
import { TypographyEngineController } from './api/controllers/typography-engine.controller';
import { ResolveFontsHandler } from './application/commands/resolve-fonts.handler';
import { ApplyShapingHandler } from './application/commands/apply-shaping.handler';
import { GetConfigHandler } from './application/queries/get-config.handler';
import { ListFontsHandler } from './application/queries/list-fonts.handler';

@Module({
  imports: [
    CqrsModule,TypeOrmModule.forFeature([FontFamily, ShapingRule, FallbackLadder], 'd8_connection')],
  controllers: [TypographyEngineController],
  providers: [TypographyEngineService, ResolveFontsHandler, ApplyShapingHandler, GetConfigHandler, ListFontsHandler],
  exports: [TypographyEngineService],
})
export class TypographyEngineModule {}
