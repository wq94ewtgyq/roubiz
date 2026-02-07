import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// [1] 공통 서비스
import { ExcelService } from './common/excel.service';

// [2] 핵심 도메인 모듈
import { ProductModule } from './product/product.module';
import { OrderModule } from './order/order.module';
import { SettlementModule } from './settlement/settlement.module';
import { DashboardModule } from './dashboard/dashboard.module';

// [3] 매핑 모듈 (Client & Supplier)
import { ClientProductModule } from './client-product/client-product.module'; 
import { SupplierProductModule } from './supplier-product/supplier-product.module';

@Module({
  imports: [
    ProductModule, 
    OrderModule, 
    SettlementModule, 
    DashboardModule, 
    ClientProductModule, 
    SupplierProductModule 
  ],
  controllers: [AppController],
  providers: [AppService, ExcelService], 
})
export class AppModule {}