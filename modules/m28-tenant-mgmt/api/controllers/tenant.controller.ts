import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SetMetadata , UseGuards} from '@nestjs/common';
const Roles = (...roles: string[]) => SetMetadata('roles', roles);
import { Controller, Get, Post, Put, Body, Param, Query , UseGuards} from '@nestjs/common';
import { TenantService } from '../../application/services/tenant.service';
import { Audit } from '../../../shared/decorators';
import { TenantGuard, RolesGuard } from '../../../../shared/guards';


@UseGuards(TenantGuard, RolesGuard)
@Controller('api/v1/tenants')
@Roles('admin', 'super_admin') // B1 FIX: Admin-only tenant management
export class TenantController {
  constructor(private readonly service: TenantService) {}

  @Post() @Audit('restricted') async create(@Body() body: Record<string, unknown>) { return this.service.createTenant(body); }
  @Get(':id') async get(@Param('id') id: string) { return this.service.getTenant(id); }
  @Get() async list(@Query('status') s?: string) { return this.service.listTenants(s); }
  @Post(':id/suspend') @Audit('restricted') async suspend(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.suspendTenant(id, body.reason); }
  @Post(':id/activate') @Audit('restricted') async activate(@Param('id') id: string) { return this.service.activateTenant(id); }
  @Post(':id/databases') @Audit('restricted') async registerDb(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.registerDatabase(id, body); }
  @Get(':id/databases') async getDbs(@Param('id') id: string) { return this.service.getTenantDatabases(id); }
  @Post(':id/databases/:moduleId/backup') @Audit('restricted') async backup(@Param('id') id: string, @Param('moduleId') m: string) { return this.service.backupDatabase(id, m); }
  @Post(':id/isolation-test') @Audit('restricted') async isolationTest(@Param('id') id: string, @Body() body: Record<string, unknown>) { return this.service.runIsolationTest(id, body.targetModule); }
  @Get(':id/isolation-results') async isolationResults(@Param('id') id: string) { return this.service.getIsolationResults(id); }
  @Get('health') async health() { return this.service.health(); }
}
