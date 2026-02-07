import { Module } from '@nestjs/common';
import { SalesChannelService } from './sales-channel.service';
import { SalesChannelController } from './sales-channel.controller';

@Module({
  controllers: [SalesChannelController],
  providers: [SalesChannelService],
})
export class SalesChannelModule {}
