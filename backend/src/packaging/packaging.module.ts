import { Module } from '@nestjs/common';
import { PackagingService } from './packaging.service.js';

@Module({
  providers: [PackagingService],
  exports: [PackagingService],
})
export class PackagingModule {}

