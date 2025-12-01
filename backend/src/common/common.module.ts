import { Global, Module } from '@nestjs/common';
import { EvidenceLogger } from './logger.js';

@Global()
@Module({
  providers: [EvidenceLogger],
  exports: [EvidenceLogger],
})
export class CommonModule {}

