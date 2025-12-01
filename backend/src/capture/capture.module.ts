import { Module } from '@nestjs/common';
import { HttpCaptureService } from './http-capture.service.js';
import { BrowserCaptureService } from './browser-capture.service.js';
import { CaptureController } from './capture.controller.js';
import { EvidenceModule } from '../evidence/evidence.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { PackagingModule } from '../packaging/packaging.module.js';

@Module({
  imports: [EvidenceModule, CryptoModule, PackagingModule],
  controllers: [CaptureController],
  providers: [HttpCaptureService, BrowserCaptureService],
  exports: [HttpCaptureService, BrowserCaptureService],
})
export class CaptureModule {}
