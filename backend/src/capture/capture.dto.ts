/**
 * EvidenTrace - Capture DTOs
 * 
 * Data Transfer Objects for capture API requests.
 */

import { 
  IsString, 
  IsUrl, 
  IsOptional, 
  IsBoolean, 
  IsInt, 
  Min, 
  Max,
  IsObject,
} from 'class-validator';

export class CaptureRequestDto {
  @IsUrl({}, { message: 'A valid URL is required' })
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  maxRedirects?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(120000)
  timeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  browserCapture?: boolean;

  @IsOptional()
  @IsBoolean()
  recordVideo?: boolean;

  @IsOptional()
  @IsBoolean()
  generateZip?: boolean;

  @IsOptional()
  @IsBoolean()
  generatePdf?: boolean;

  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string>;

  @IsOptional()
  @IsString()
  operatorNotes?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}

export class VerifyHashesDto {
  @IsString()
  acquisitionId!: string;
}

export class VerifyTimestampDto {
  @IsString()
  acquisitionId!: string;
}

