import { Module } from '@nestjs/common';
import { ClientProductService } from './client-product.service';
import { ClientProductController } from './client-product.controller';

@Module({
  controllers: [ClientProductController],
  providers: [ClientProductService],
})
export class ClientProductModule {}