// Rasid v6.4 — Base DTOs — B2 Fix
import { IsString, IsOptional, IsUUID, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TenantAwareDto {
  @ApiProperty({ description: 'Tenant UUID' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;
}

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class TenantPaginatedDto extends PaginationDto {
  @ApiProperty({ description: 'Tenant UUID' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;
}

export class IdParamDto {
  @ApiProperty({ description: 'Resource UUID' })
  @IsUUID()
  @IsNotEmpty()
  id: string;
}

export class BulkOperationDto extends TenantAwareDto {
  @ApiProperty({ description: 'Array of resource IDs', type: [String] })
  @IsUUID(undefined, { each: true })
  ids: string[];
}

export class DateRangeDto {
  @ApiPropertyOptional({ description: 'Start date (ISO format)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO format)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
