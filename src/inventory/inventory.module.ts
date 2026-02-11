import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService], // ★ 중요: 다른 모듈에서 쓰려면 필수
})
export class InventoryModule {}