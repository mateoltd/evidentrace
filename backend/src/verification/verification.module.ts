import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service.js';
import { VerificationController } from './verification.controller.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';

@Module({
  imports: [EvidenceModule, CryptoModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
