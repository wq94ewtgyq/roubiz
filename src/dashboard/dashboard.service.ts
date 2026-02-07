// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class DashboardService {
  
  // [월별 손익 계산]
  async getMonthlyStats(month: string) { // 예: '2026-02'
    
    // 1. 해당 월의 정산 확정된 내역을 모두 합산 (Sum)
    const stats = await prisma.salesLedger.aggregate({
      where: {
        targetMonth: month,
        isSettled: true // 정산 완료된 건만 계산
      },
      _sum: {
        confirmedSalePrice: true,   // 총 거래액 (GMV)
        confirmedCommission: true,  // 총 수수료 (비용)
        confirmedSupplyPrice: true  // 총 정산금 (매출)
      },
      _count: {
        id: true // 총 주문 건수
      }
    });

    // 2. 보기 좋게 정리해서 반환
    return {
      targetMonth: month,
      totalOrders: stats._count.id, // 총 판매 건수
      
      // null일 경우 0으로 처리
      totalGrossSales: Number(stats._sum.confirmedSalePrice || 0), // 거래액
      totalPlatformFee: Number(stats._sum.confirmedCommission || 0), // 플랫폼 수수료
      
      // [핵심] 사장님이 가져가는 진짜 돈
      finalNetIncome: Number(stats._sum.confirmedSupplyPrice || 0), 
      
      message: `${month}월 손익 리포트 생성 완료`
    };
  }
}