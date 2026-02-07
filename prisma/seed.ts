// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 기초 데이터 주입 (Smart Flow)...');

  // 1. 거래처 생성 (BusinessRole)
  const coupang = await prisma.businessRole.upsert({
    where: { businessName: '쿠팡' },
    update: {},
    create: { businessName: '쿠팡', isClient: true, clientGroup: 'ST', recognitionKeyword: '쿠팡' },
  });
  
  const vendorA = await prisma.businessRole.upsert({
    where: { businessName: '김씨공장' },
    update: {},
    create: { businessName: '김씨공장', isSupplier: true, clientGroup: 'DT', description: '메인 공급처' },
  });

  // 2. 상품 생성 (RoubizProduct)
  // [2-1] 단품: 블랙마카 낱개
  const singleItem = await prisma.roubizProduct.upsert({
    where: { roubizCode: 'R100081' },
    update: {},
    create: { 
      roubizCode: 'R100081', 
      name: '블랙마카 100포 (단품)', 
      standardCost: 15000,
      isSet: false 
    }
  });

  // [2-2] 세트: 블랙마카 선물세트 (3개입)
  const setItem = await prisma.roubizProduct.upsert({
    where: { roubizCode: 'RB-10001' },
    update: {},
    create: { 
      roubizCode: 'RB-10001', 
      name: '블랙마카 선물세트 (3box)', 
      standardCost: 45000, 
      isSet: true 
    }
  });

  // 3. BOM 구성 (ProductBundle)
  // 선물세트(RB-10001) 1개에는 단품(R100081) 3개가 들어간다.
  await prisma.productBundle.create({
    data: {
      parentProductId: setItem.id,
      childProductId: singleItem.id,
      quantity: 3
    }
  });

  console.log('✅ BOM 데이터 생성 완료: 세트(1) -> 단품(3)');

  // 4. 매핑 (Mapping)
  // 쿠팡에서 'A001'이라고 들어오면 -> 우리 '선물세트(RB-10001)'로 인식해라
  await prisma.clientProductMapping.create({
    data: {
      clientRoleId: coupang.id,
      clientProductCode: 'A001',
      clientOptionName: '옵션없음',
      roubizProductId: setItem.id
    }
  });

  console.log('✨ 시딩 완료.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });