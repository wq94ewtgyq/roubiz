import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { ExcelService } from '../common/excel.service';
import { InventoryModule } from '../inventory/inventory.module'; // ★ Import

@Module({
  imports: [InventoryModule], // ★ InventoryModule 주입
  controllers: [OrderController],
  providers: [OrderService, ExcelService],
})
export class OrderModule {}