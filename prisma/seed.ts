// prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [ERP 초기 데이터] 시딩 시작...');

  // -------------------------------------------------------
  // [0] 초기화 (기존 데이터 삭제 - 순서 중요: 자식 -> 부모)
  // -------------------------------------------------------
  // 주의: 개발 환경에서만 사용하세요.
  await prisma.orderExecution.deleteMany();
  await prisma.roubizOrder.deleteMany();
  await prisma.clientOrder.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.clientProductMapping.deleteMany();
  
  console.log('🧹 기존 트랜잭션 데이터 초기화 완료');

  // -------------------------------------------------------
  // [1] 기초 마스터 (본사, 거래처, 창고, 택배사)
  // -------------------------------------------------------
  
  // 1. 본사
  const biz = await prisma.business.upsert({
    where: { businessName: '루트바이 본사' },
    update: {},
    create: { businessName: '루트바이 본사', ownerName: '김서늬' }
  });

  // 2. 판매처 (Client)
  const client = await prisma.client.upsert({
    where: { id: 1 },
    update: {},
    create: {
      businessId: biz.id,
      name: '테스트스토어', // ★ 주문서의 channelName과 일치해야 함
      waybillFormat: JSON.stringify({
        "주문번호": "clientOrder.clientOrderNo", 
        "송장번호": "execution.trackingNumber",
        "택배사": "execution.carrier.name" 
      })
    }
  });

  // 3. 창고 (Warehouse)
  const warehouse = await prisma.warehouse.upsert({
    where: { id: 1 },
    update: {},
    create: {
      businessId: biz.id,
      name: '용인 메인창고',
      location: '경기도 용인시 처인구'
    }
  });

  // 4. 택배사 (Carrier)
  await prisma.carrier.upsert({
    where: { code: 'CJ' },
    update: {},
    create: {
      code: 'CJ', name: 'CJ대한통운', type: 'PARCEL',
      mappings: { create: [{ alias: 'CJ택배' }] }
    }
  });

  // -------------------------------------------------------
  // [2] 상품 및 재고 (Product & Inventory)
  // -------------------------------------------------------

  // 5. 상품 생성 (홍삼정)
  const product = await prisma.roubizProduct.upsert({
    where: { roubizCode: 'P_TEST_001' },
    update: {},
    create: { roubizCode: 'P_TEST_001', name: '테스트용 홍삼정', standardCost: 5000 }
  });

  // 6. 상품 매핑 (판매처 코드 'P001' -> 내부 코드 'P_TEST_001')
  // ★ 중요: targetWarehouseId가 있어야 창고 출고로 잡힘
  await prisma.clientProductMapping.create({
    data: {
      clientId: client.id,
      clientProductCode: 'P001',      // 주문 들어올 때 코드
      clientOptionName: '옵션없음',    // 옵션명
      roubizProductId: product.id,
      targetWarehouseId: warehouse.id // 이 상품은 '용인창고'에서 출고
    }
  });

  // 7. 기초 재고 세팅 (1,000개)
  // ★ 중요: 이게 있어야 allocateStock(재고할당)이 성공함
  await prisma.warehouseStock.create({
    data: {
      warehouseId: warehouse.id,
      roubizProductId: product.id,
      quantity: 1000, // 넉넉하게
      allocated: 0
    }
  });

  console.log(`✅ [마스터] 상품/창고/매핑 생성 완료`);
  console.log(`✅ [재고] ${product.name} : 1,000개 세팅 완료`);
  console.log(`🚀 시딩 완료! 이제 API 테스트를 진행하세요.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });