// src/settlement/settlement.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SettlementService {
  
  /**
   * [전체 정산 내역 조회]
   * 현재는 에러 방지를 위해 빈 배열을 반환합니다.
   * 향후 RoubizOrder와 SupplierOrderItem을 기준으로 정산 로직을 다시 구현해야 합니다.
   */
  async findAll() {
    // TODO: 새로운 주문 흐름에 맞춘 정산 내역 집계 로직 구현 필요
    return []; 
  }

  /**
   * [특정 주문 정산 실행]
   * 기존의 존재하지 않는 테이블(orderLine 등) 참조 코드를 모두 제거했습니다.
   */
  async calculate(orderId: number) {
    return { 
      orderId, 
      message: '정산 로직은 Roubiz Order 시스템에 맞춰 리팩토링 예정입니다.' 
    };
  }
}