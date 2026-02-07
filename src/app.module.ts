import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SalesChannelModule } from './sales-channel/sales-channel.module';
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { SettlementModule } from './settlement/settlement.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SalesProductModule } from './sales-product/sales-product.module';
import { PurchaseProductModule } from './purchase-product/purchase-product.module';

@Module({
  imports: [SalesChannelModule, ProductModule, OrderModule, SettlementModule, DashboardModule, SalesProductModule, PurchaseProductModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
