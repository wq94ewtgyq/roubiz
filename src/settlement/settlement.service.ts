// src/settlement/settlement.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
// [수정 1] SalesGroup을 여기서 가져와야 합니다.
import { PrismaClient, SalesGroup } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SettlementService {

  // [핵심] 주문 건별 정산 실행
  async calculate(orderId: number) {
    // 1. 주문 정보와 채널 정보를 한 번에 가져옴
    const order = await prisma.orderLine.findUnique({
      where: { id: orderId },
      include: {
        batch: {
          include: {
            businessRole: {
              include: { channelType: true } // 채널 정보(ST/DT) 접근
            }
          }
        }
      }
    });

    if (!order) throw new BadRequestException('주문을 찾을 수 없습니다.');
    if (order.isSettled) throw new BadRequestException('이미 정산된 주문입니다.');

    // 2. 계산 로직 (ST vs DT)
    const channelGroup = order.batch.businessRole.channelType.group;
    const salesPrice = Number(order.quantity) * 10000; // (임시) 단가 1만원 가정
    
    let commission = 0;

    // [수정 2] 단순 문자열 'ST'가 아니라, SalesGroup.ST (Enum)와 비교해야 합니다.
    if (channelGroup === SalesGroup.ST) {
      // [ST] 타사 역량: 수수료가 비쌈 (예: 15%)
      commission = salesPrice * 0.15;
    } else {
      // [DT] 자사 역량: PG 수수료 정도만 나감 (예: 3%)
      commission = salesPrice * 0.03;
    }

    // 3. 장부(SalesLedger)에 기록
    await prisma.salesLedger.create({
      data: {
        orderLineId: order.id,
        targetMonth: '2026-02', // (임시) 이번 달
        confirmedSalePrice: salesPrice,
        confirmedCommission: commission,
        confirmedSupplyPrice: salesPrice - commission, // 이게 진짜 매출
        isSettled: true,
      },
    });

    // 4. 주문 상태 업데이트 (정산 완료)
    await prisma.orderLine.update({
      where: { id: orderId },
      data: { isSettled: true },
    });

    return {
      message: '정산 완료',
      type: channelGroup, // ST인지 DT인지 알려줌
      salesPrice: salesPrice,
      fee: commission,
      finalEarnings: salesPrice - commission // 최종 정산금
    };
  }

  // [조회] 전체 정산 내역 보기
  async findAll() {
    return await prisma.salesLedger.findMany({
      orderBy: { id: 'desc' },
      include: { orderLine: true }
    });
  }
}