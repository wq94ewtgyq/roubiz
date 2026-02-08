// src/order/order.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient, RoubizOrder } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class OrderService {
  
  /**
   * [주문 생성]
   * 1. ClientOrder(수주 원본)를 저장합니다.
   * 2. 매핑 정보가 있다면 RoubizOrder(내부 관리 주문)로 자동 변환합니다.
   */
  async create(dto: CreateOrderDto) {
    const safeOption = dto.optionName?.trim() || '옵션없음';

    // 1. 판매처(Client) 존재 여부 확인
    const client = await prisma.businessRole.findUnique({
      where: { businessName: dto.channelName },
    });
    if (!client) throw new NotFoundException(`'${dto.channelName}' 판매처를 찾을 수 없습니다.`);

    // [STEP 1] Client Order 저장 (Input)
    const clientOrder = await prisma.clientOrder.create({
      data: {
        clientRoleId: client.id,
        clientOrderNo: dto.orderNo,
        productCode: dto.productCode,
        optionName: safeOption,
        quantity: dto.quantity,
        salesPrice: dto.price,
        orderDate: new Date(),
        isConverted: false,
      }
    });

    // [STEP 2] Roubiz Order 변환 (Hub)
    // 고객사 상품코드 + 옵션명으로 내부 기준 상품을 찾습니다.
    const mapping = await prisma.clientProductMapping.findUnique({
      where: {
        clientRoleId_clientProductCode_clientOptionName: {
          clientRoleId: client.id,
          clientProductCode: dto.productCode,
          clientOptionName: safeOption
        }
      },
      include: { roubizProduct: true }
    });

    // RoubizOrder 타입을 명시하여 null 대입 에러 방지
    let roubizOrder: RoubizOrder | null = null; 

    if (mapping) {
      // 고유한 루비즈 주문번호 생성 (R-YYMMDD-랜덤문자)
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      
      roubizOrder = await prisma.roubizOrder.create({
        data: {
          clientOrderId: clientOrder.id,
          roubizOrderNo: `R-${dateStr}-${randomStr}`,
          roubizProductId: mapping.roubizProductId,
          quantity: dto.quantity,
          status: 'READY'
        }
      });

      // 변환 성공 시 원본 주문의 상태 업데이트
      await prisma.clientOrder.update({
        where: { id: clientOrder.id },
        data: { isConverted: true }
      });
    }

    return {
      message: '주문 접수가 완료되었습니다.',
      status: mapping ? 'SUCCESS' : 'WARNING',
      matchResult: mapping ? `✅ 인식상품: ${mapping.roubizProduct.name}` : '⚠️ 매핑 정보가 없어 변환되지 않았습니다.',
      roubizOrderNo: roubizOrder?.roubizOrderNo || null
    };
  }

  /**
   * [전체 조회]
   * 모든 수주 내역과 변환된 루비즈 주문 정보를 함께 가져옵니다.
   */
  async findAll() {
    return await prisma.clientOrder.findMany({
      include: {
        roubizOrders: { 
          include: { roubizProduct: true } 
        }
      },
      orderBy: { id: 'desc' },
    });
  }

  /**
   * [삭제]
   * 수주 원본 데이터를 삭제합니다. (참조 관계에 따라 루비즈 주문도 연쇄 삭제될 수 있습니다.)
   */
  async remove(id: number) {
    return await prisma.clientOrder.delete({ where: { id } });
  }
}