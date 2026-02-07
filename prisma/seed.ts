// prisma/seed.ts
import { PrismaClient, SalesGroup } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 기초 데이터 주입 시작 (Schema 변경 반영됨)...');

  // [1] 판매처(BusinessRole) 정의
  // SalesChannelType 테이블이 삭제되었으므로, BusinessRole에 직접 속성을 부여합니다.
  const roles = [
    { 
      name: '오픈마켓', 
      group: SalesGroup.ST, 
      keyword: '쿠팡', // [중요] 엑셀 파일명에 '쿠팡'이 있으면 이 채널로 인식
      desc: '쿠팡, 네이버, 11번가 등 오픈마켓' 
    },
    { 
      name: '종합밴더', 
      group: SalesGroup.ST, 
      keyword: '도매꾹', 
      desc: '도매꾹, 오너클랜 등 B2B 위탁' 
    },
    { 
      name: '자사몰', 
      group: SalesGroup.DT, 
      keyword: '카페24', 
      desc: '카페24, 고도몰 등 자사 운영 몰' 
    },
    { 
      name: '자사매장', 
      group: SalesGroup.DT, 
      keyword: '매장', 
      desc: '오프라인 직영 매장' 
    },
    { 
      name: '직거래', 
      group: SalesGroup.DT, 
      keyword: '전화주문', 
      desc: '전화, 카톡 주문 등' 
    },
  ];

  // [2] 판매처 생성 (upsert: 없으면 생성, 있으면 업데이트)
  for (const role of roles) {
    const createdRole = await prisma.businessRole.upsert({
      where: { businessName: role.name }, // 이름으로 중복 확인
      update: {
        salesGroup: role.group,
        recognitionKeyword: role.keyword,
        description: role.desc,
        isSalesChannel: true, // 판매처 플래그 ON
      },
      create: {
        businessName: role.name,
        salesGroup: role.group,
        recognitionKeyword: role.keyword,
        description: role.desc,
        isSalesChannel: true, // 판매처 플래그 ON
      },
    });
    console.log(`✅ 판매처 처리 완료: [${role.group}] ${role.name} (키워드: ${role.keyword})`);
  }

  // [3] 테스트용 상품 생성 (블랙마카)
  const product = await prisma.dbProduct.upsert({
    where: { dbCode: 'A001' },
    update: {},
    create: {
      dbCode: 'A001',
      name: '블랙마카 100포',
      purchaseCost: 15000,
      status: 'ACTIVE'
    }
  });
  console.log(`✅ 상품 생성 완료: ${product.name} (${product.dbCode})`);

  console.log('✨ 모든 기초 데이터 주입이 완료되었습니다.');
}

main()
  .catch((e) => {
    console.error('❌ 시딩 중 에러 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });