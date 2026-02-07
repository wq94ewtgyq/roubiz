import { Module } from '@nestjs/common';
import { PurchaseProductService } from './purchase-product.service';
import { PurchaseProductController } from './purchase-product.controller';

@Module({
  controllers: [PurchaseProductController],
  providers: [PurchaseProductService],
})
export class PurchaseProductModule {}
