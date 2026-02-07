// prisma/seed.ts
import { PrismaClient, SalesGroup } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 기존 데이터가 있다면 초기화(선택사항)보다는, '없으면 생성'하는 방식으로 안전하게 갑니다.
  const channelTypes = [
    { name: '오픈마켓', group: SalesGroup.ST, desc: '쿠팡, 네이버, 11번가 등' },
    { name: '종합밴더', group: SalesGroup.ST, desc: '도매꾹, 오너클랜 등' },
    { name: '반폐쇄몰', group: SalesGroup.ST, desc: '복지몰, 임직원몰' },
    { name: '자사몰', group: SalesGroup.DT, desc: '카페24, 고도몰 (자사 운영)' },
    { name: '자사매장', group: SalesGroup.DT, desc: '오프라인 직영 매장' },
    { name: '직거래', group: SalesGroup.DT, desc: '전화주문, B2B 납품' },
  ];

  console.log('🌱 기초 데이터 주입 시작...');

  for (const type of channelTypes) {
    const exists = await prisma.salesChannelType.findUnique({
      where: { name: type.name },
    });

    if (!exists) {
      await prisma.salesChannelType.create({
        data: {
          name: type.name,
          group: type.group,
          description: type.desc,
        },
      });
      console.log(`✅ 생성됨: [${type.group}] ${type.name}`);
    }
  }
  console.log('✨ 기초 데이터 주입 완료.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });