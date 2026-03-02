import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity, PermissionEntity, UserRoleEntity, PolicyEntity } from './domain/entities';
import { K2AuthzService } from './application/handlers/authz.service';
import { K2AuthzController } from './api/controllers/authz.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, PermissionEntity, UserRoleEntity, PolicyEntity], 'k2_connection')],
  controllers: [K2AuthzController],
  providers: [K2AuthzService],
  exports: [K2AuthzService],
})
export class K2AuthzModule {}
