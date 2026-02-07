import { Module } from '@nestjs/common';
import { SalesProductService } from './sales-product.service';
import { SalesProductController } from './sales-product.controller';

@Module({
  controllers: [SalesProductController],
  providers: [SalesProductService],
})
export class SalesProductModule {}
