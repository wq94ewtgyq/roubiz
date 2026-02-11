import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { BusinessModule }       from './business/business.module';
import { ClientModule }         from './client/client.module';
import { ProductModule }        from './product/product.module';
import { OrderModule }          from './order/order.module';
import { CsModule }             from './cs/cs.module';
import { SettlementModule }     from './settlement/settlement.module';
import { InventoryModule }      from './inventory/inventory.module';
import { SupplierModule }       from './supplier/supplier.module';
import { WarehouseModule }      from './warehouse/warehouse.module';
import { CarrierModule }        from './carrier/carrier.module';
import { ClientProductModule }  from './client-product/client-product.module';
import { SupplierProductModule } from './supplier-product/supplier-product.module';
import { DashboardModule }      from './dashboard/dashboard.module';

@Module({
  imports: [
    BusinessModule,        // [1] 사업자 / 거래처 / 컨택 타임라인
    ClientModule,          // [2] 판매처 관리 + 매출상품
    ProductModule,         // [3] 매입상품 + 세트상품
    OrderModule,           // [4] 수발주 / 운송장
    CsModule,              // [5] CS / AS 관리
    SettlementModule,      // [6] 정산
    InventoryModule,       // [7] 창고 재고
    SupplierModule,        // [8] 매입처 관리
    WarehouseModule,       // [9] 창고 관리
    CarrierModule,         // [10] 택배사 관리
    ClientProductModule,   // 매출상품 매핑 (기존)
    SupplierProductModule, // 매입처-상품 연결 (기존)
    DashboardModule,       // 대시보드
  ],
  controllers: [AppController],
  providers:   [AppService],
})
export class AppModule {}
