import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module.js';
import { CaptureModule } from './capture/capture.module.js';
import { EvidenceModule } from './evidence/evidence.module.js';
import { CryptoModule } from './crypto/crypto.module.js';
import { PackagingModule } from './packaging/packaging.module.js';
import { VerificationModule } from './verification/verification.module.js';
import configuration from './config/configuration.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
    CaptureModule,
    EvidenceModule,
    CryptoModule,
    PackagingModule,
    VerificationModule,
  ],
})
export class AppModule {}
