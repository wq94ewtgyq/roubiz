// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 새로운 계층 구조로 시드 데이터를 생성합니다...');

  // 1. 최상위 사업자 (Business)
  const myBiz = await prisma.business.upsert({
    where: { businessName: '(주)루비즈' },
    update: {},
    create: {
      businessName: '(주)루비즈',
      ownerName: '김서늬',
    },
  });

  // 2. 판매처 (SalesChannel) - 엑셀 양식 포함
  const coupang = await prisma.salesChannel.create({
    data: {
      businessId: myBiz.id,
      name: '쿠팡',
      code: 'CP01',
      excelMapping: {
        orderNo: '주문번호',
        productCode: '등록상품명', // 엑셀에서 찾을 헤더명
        optionName: '등록옵션명',
        qty: '구매수량',
        price: '판매가'
      }
    }
  });

  // 3. 매입처 (Supplier)
  const factoryA = await prisma.supplier.create({
    data: {
      businessId: myBiz.id,
      name: '김씨공장',
      orderFormat: { type: 'STANDARD_PDF' }
    }
  });

  // 4. 상품 생성
  const singleItem = await prisma.roubizProduct.create({
    data: {
      roubizCode: 'R-S001',
      name: '블랙마카 단품',
      standardCost: 5000,
      isSet: false,
    },
  });

  // 5. 매핑 연결 (판매처 <-> 루비즈상품)
  await prisma.clientProductMapping.create({
    data: {
      salesChannelId: coupang.id,
      clientProductCode: 'A001',
      clientOptionName: '기본',
      roubizProductId: singleItem.id,
    },
  });

  // 6. 매입처 상품 연결
  await prisma.supplierProduct.create({
    data: {
      supplierId: factoryA.id,
      roubizProductId: singleItem.id,
      costPrice: 4800,
      isPrimary: true
    }
  });

  console.log('✅ 시드 데이터 생성 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });