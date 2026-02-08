import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 시드 데이터 생성을 시작합니다...');

  // 1. 거래처 (BusinessRole)
  const coupang = await prisma.businessRole.upsert({
    where: { businessName: '쿠팡' },
    update: {},
    create: {
      businessName: '쿠팡',
      isClient: true,
      clientGroup: 'ST',
    },
  });

  const factoryA = await prisma.businessRole.upsert({
    where: { businessName: '김씨공장' },
    update: {},
    create: {
      businessName: '김씨공장',
      isSupplier: true,
    },
  });

  // 2. 루비즈 상품 (RoubizProduct)
  const singleItem = await prisma.roubizProduct.upsert({
    where: { roubizCode: 'R-S001' },
    update: {},
    create: {
      roubizCode: 'R-S001',
      name: '기본 단품',
      standardCost: 5000,
      isSet: false,
    },
  });

  const setItem = await prisma.roubizProduct.upsert({
    where: { roubizCode: 'R-B001' },
    update: {},
    create: {
      roubizCode: 'R-B001',
      name: '3개 묶음 세트',
      isSet: true,
    },
  });

  // 3. 세트 구성 (ProductBundle)
  await prisma.productBundle.upsert({
    where: {
      parentProductId_childProductId: {
        parentProductId: setItem.id,
        childProductId: singleItem.id,
      },
    },
    update: { quantity: 3 },
    create: {
      parentProductId: setItem.id,
      childProductId: singleItem.id,
      quantity: 3,
    },
  });

  // 4. 상품 매핑 (Mapping)
  await prisma.clientProductMapping.upsert({
    where: {
      clientRoleId_clientProductCode_clientOptionName: {
        clientRoleId: coupang.id,
        clientProductCode: 'CP-CODE-001',
        clientOptionName: '기본',
      },
    },
    update: {},
    create: {
      clientRoleId: coupang.id,
      clientProductCode: 'CP-CODE-001',
      clientOptionName: '기본',
      roubizProductId: setItem.id,
    },
  });

  // 5. 공급처 단가 매핑 (SupplierProduct)
  await prisma.supplierProduct.upsert({
    where: {
      supplierId_roubizProductId: {
        supplierId: factoryA.id,
        roubizProductId: singleItem.id,
      },
    },
    update: { costPrice: 4800 },
    create: {
      supplierId: factoryA.id,
      roubizProductId: singleItem.id,
      costPrice: 4800,
      isPrimary: true,
    },
  });

  console.log('✅ 시드 데이터 생성이 완료되었습니다.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });