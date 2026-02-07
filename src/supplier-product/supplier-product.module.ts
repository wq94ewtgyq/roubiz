import { Module } from '@nestjs/common';
import { SupplierProductService } from './supplier-product.service';
import { SupplierProductController } from './supplier-product.controller';

@Module({
  controllers: [SupplierProductController],
  providers: [SupplierProductService],
})
export class SupplierProductModule {}