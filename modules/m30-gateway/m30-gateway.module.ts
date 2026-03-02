import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { M30GatewayController } from './api/controllers/gateway.controller';
import { M30GatewayService } from './application/handlers/gateway.service';
import {
  RouteDefinitionEntity, RateLimitEntity, GatewayApiKeyEntity,
  RequestLogEntity, TransformationRuleEntity,
} from './domain/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RouteDefinitionEntity, RateLimitEntity, GatewayApiKeyEntity,
      RequestLogEntity, TransformationRuleEntity,
    ], 'm30_connection'),
  ],
  controllers: [M30GatewayController],
  providers: [M30GatewayService],
  exports: [M30GatewayService],
})
export class M30GatewayModule {}
