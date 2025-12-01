/**
 * EvidenTrace - Verification Controller
 * 
 * REST API endpoints for evidence verification operations.
 */

import { 
  Controller, 
  Post, 
  Body, 
  HttpException, 
  HttpStatus,
} from '@nestjs/common';
import { VerificationService } from './verification.service.js';
import { 
  HashVerificationResult, 
  TimestampVerificationResult 
} from '../capture/capture.types.js';
import { VerifyHashesDto, VerifyTimestampDto } from '../capture/capture.dto.js';

@Controller('api/verify')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * POST /api/verify/hashes
   * Verify file hashes for an acquisition.
   */
  @Post('hashes')
  async verifyHashes(@Body() dto: VerifyHashesDto): Promise<HashVerificationResult> {
    try {
      return await this.verificationService.verifyHashes(dto.acquisitionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Hash verification failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/verify/ots
   * Verify OpenTimestamps proof for an acquisition.
   */
  @Post('ots')
  async verifyTimestamp(@Body() dto: VerifyTimestampDto): Promise<TimestampVerificationResult> {
    try {
      return await this.verificationService.verifyTimestamp(dto.acquisitionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpException(
        `Timestamp verification failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

