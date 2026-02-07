// src/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class DashboardService {
  
  // [실시간 월별 예상 손익]
  async getMonthlyStats(month: string) { // 예: '2026-02'
    
    // 날짜 범위 설정 (해당 월 1일 ~ 다음 달 1일)
    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // 1. [매출] ClientOrder (수주) 집계
    // - 업로드된 주문들의 판매가 합계
    const salesStats = await prisma.clientOrder.aggregate({
      where: {
        orderDate: {
          gte: startDate,
          lt: endDate
        }
      },
      _sum: {
        salesPrice: true, // 판매가 합계
      },
      _count: {
        id: true // 총 주문 건수
      }
    });

    // 2. [원가] RoubizOrder (상품) 기준 원가 계산
    // - 주문된 상품들의 standardCost 합계
    const soldItems = await prisma.roubizOrder.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        roubizProduct: true // 상품 정보(원가) 가져오기
      }
    });

    // JS에서 원가 합산 (수량 * 기준원가)
    let totalCost = 0;
    for (const item of soldItems) {
      const cost = Number(item.roubizProduct.standardCost || 0);
      totalCost += cost * item.quantity;
    }

    // 3. [결과] 예상 손익 계산
    const totalSales = salesStats._sum.salesPrice?.toNumber() || 0;
    const estimatedProfit = totalSales - totalCost;

    return {
      targetMonth: month,
      
      totalOrders: salesStats._count.id,      // 총 주문 수
      totalGrossSales: totalSales,            // 총 매출 (GMV)
      totalEstimatedCost: totalCost,          // 예상 원가
      
      // [핵심] 실시간 예상 이익
      estimatedNetIncome: estimatedProfit,    
      profitMargin: totalSales > 0 ? ((estimatedProfit / totalSales) * 100).toFixed(1) + '%' : '0%',

      message: `💰 ${month}월 실시간 추정 손익 (ClientOrder 기준)`
    };
  }
}