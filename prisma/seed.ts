// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 초기 데이터 시딩 시작...');

  // 1. Business(본사) 생성 (Upsert: 있으면 유지, 없으면 생성)
  const biz = await prisma.business.upsert({
    where: { businessName: '루트바이 본사' },
    update: {},
    create: { businessName: '루트바이 본사', ownerName: '김서늬' }
  });

  // 2. Client(판매처) 생성 (중복 체크 후 생성)
  // Client 테이블의 name은 unique가 아닐 수 있으므로 findFirst로 확인
  let client = await prisma.client.findFirst({ 
    where: { name: '테스트스토어' } 
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        businessId: biz.id,
        name: '테스트스토어',
        code: 'TEST_001',
        waybillFormat: { 
          "주문번호": "clientOrder.clientOrderNo", 
          "택배사": "carrier.name", 
          "송장번호": "trackingNumber" 
        } 
      }
    });
    console.log(` - Client 생성됨: ${client.name}`);
  } else {
    console.log(` - Client 이미 존재함: ${client.name}`);
  }

  // 3. 택배사 및 매핑 등록 (Upsert 사용)
  
  // 3-1. CJ대한통운
  await prisma.carrier.upsert({
    where: { code: 'CJ' },
    update: {}, // 이미 있으면 아무것도 안 함
    create: {
      code: 'CJ',
      name: 'CJ대한통운',
      type: 'PARCEL',
      mappings: {
        create: [
          { alias: 'CJ택배' },
          { alias: '대한통운' },
          { alias: 'cj' }
        ]
      }
    }
  });

  // 3-2. 우체국택배
  await prisma.carrier.upsert({
    where: { code: 'POST' },
    update: {},
    create: {
      code: 'POST',
      name: '우체국택배',
      type: 'PARCEL',
      mappings: {
        create: [
          { alias: '우체국' },
          { alias: 'epost' }
        ]
      }
    }
  });

  // [추가] 테스트용 상품 생성 (Upsert)
  const product = await prisma.roubizProduct.upsert({
    where: { roubizCode: 'P_TEST_001' },
    update: {},
    create: {
      roubizCode: 'P_TEST_001',
      name: '테스트용 홍삼정',
      standardCost: 5000
    }
  });

  // 4. 테스트용 주문 생성 (중복 체크)
  // RoubizOrderNo는 Unique하므로 이를 기준으로 존재 여부 확인
  const existingOrder = await prisma.roubizOrder.findUnique({
    where: { roubizOrderNo: 'R-TEST-001' }
  });

  if (!existingOrder) {
    await prisma.clientOrder.create({
      data: {
        clientId: client.id, // [변경] client.id 사용
        clientOrderNo: 'ORD-20240209-01',
        productCode: 'P001',
        optionName: '기본',
        quantity: 1,
        salesPrice: 10000,
        orderDate: new Date(),
        isConverted: true,
        roubizOrders: {
          create: {
            roubizOrderNo: 'R-TEST-001', // ★ 이 번호로 중복 체크
            roubizProductId: product.id,
            quantity: 1,
            status: 'READY' // 발주 대기 상태
          }
        }
      }
    });
    console.log(` - Test Order 생성됨: R-TEST-001`);
  } else {
    console.log(` - Test Order 이미 존재함: R-TEST-001`);
  }

  console.log(`✅ 시딩 완료!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });