import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SalesChannelModule } from './sales-channel/sales-channel.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [SalesChannelModule, ProductModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
