import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AssetStorageStatus } from '../schemas/asset.schema';

export class CreateAssetDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  archived?: boolean;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class UploadAssetDto {
  @ApiPropertyOptional({
    description: 'Display name; defaults to the original filename',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;
}

export class AssetDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  archived: boolean;

  @ApiProperty()
  version: number;

  @ApiProperty({ enum: AssetStorageStatus })
  storageStatus: AssetStorageStatus;

  @ApiPropertyOptional({ description: 'Server-generated Spaces object key' })
  storageKey?: string;

  @ApiPropertyOptional({
    description: 'Spaces origin URL; read access depends on object permissions',
  })
  storageUrl?: string;

  @ApiPropertyOptional({
    description: 'Sanitized and normalized original upload filename',
  })
  originalFilename?: string;

  @ApiPropertyOptional()
  mediaType?: string;

  @ApiPropertyOptional()
  sizeBytes?: number;

  @ApiPropertyOptional({
    pattern: '^[a-f0-9]{64}$',
    description: 'SHA-256 digest of the received file',
  })
  checksumSha256?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  receivedAt?: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
