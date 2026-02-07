// src/order/order.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class OrderService {
  
  // [주문 생성]
  async create(dto: CreateOrderDto) {
    // 1. [옵션 정규화] 데이터 클렌징
    // 빈 칸은 '옵션없음'으로 치환하고, 그 외에는 그대로 둡니다(엄격 검증을 위해).
    let safeOption = dto.optionName ? dto.optionName.trim() : '';
    if (safeOption === '') {
      safeOption = '옵션없음';
    }

    // 2. [변경됨] 판매처(BusinessRole) 찾기
    // 기존 SalesChannelType 로직 삭제 -> BusinessRole 테이블 직접 조회
    const businessRole = await prisma.businessRole.findUnique({
      where: { businessName: dto.channelName },
    });

    if (!businessRole) {
      // 판매처가 등록되지 않았다면 에러 처리 (또는 정책에 따라 자동 생성)
      throw new NotFoundException(`'${dto.channelName}' 판매처가 시스템에 등록되지 않았습니다.`);
    }

    // 3. [매핑 조회 - 엄격 모드]
    // 100% 일치하는 경우에만 가져옵니다. (상품코드 + 옵션명)
    const mapping = await prisma.salesProductMapping.findFirst({
      where: {
        clientRoleId: businessRole.id,
        salesProductCode: dto.productCode,
        salesOptionName: safeOption 
      }
    });

    // 4. 주문 묶음(Batch) 생성
    // API 호출 1회 또는 엑셀 업로드 1회를 하나의 배치로 묶습니다.
    const batch = await prisma.orderUploadBatch.create({
      data: {
        clientRoleId: businessRole.id,
        originalFileName: 'API_Order_Input', // 엑셀 업로드시는 컨트롤러에서 파일명 덮어씀
      },
    });

    // -----------------------------------------------------------
    // [5. 시스템 주문번호 생성] (New Feature)
    // 로직: [영업특성(ST/DT)]-[날짜YYMMDD]-[난수5자리]
    // 예: ST-260207-X9Z1A
    // -----------------------------------------------------------
    const prefix = businessRole.salesGroup || 'ST'; // 기본값 ST
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // 260207
    const randomStr = Math.random().toString(36).substr(2, 5).toUpperCase();
    const systemOrderNo = `${prefix}-${dateStr}-${randomStr}`;

    // 6. 주문 저장 (OrderLine)
    const order = await prisma.orderLine.create({
      data: {
        batchId: batch.id,
        externalOrderNo: dto.orderNo, // 외부(쿠팡) 주문번호
        systemOrderNo: systemOrderNo, // 내부 관리용 고유번호
        
        salesProductCode: dto.productCode,
        salesOptionName: safeOption,
        quantity: dto.quantity,
        
        // [핵심] 매핑 정보가 없으면 null로 저장 -> '매핑필요' 상태
        mappedDbProductId: mapping ? mapping.dbProductId : null,
        
        isSettled: false,
      },
    });

    // 7. 결과 반환
    return {
      message: '주문 접수 완료',
      channel: businessRole.businessName,
      systemOrderNo: systemOrderNo, // 생성된 주문번호 확인
      
      // [결과 리포트]
      matchResult: mapping ? '✅ 자동매핑완료' : '⚠️ 매핑필요 (관리자 확인 요망)',
      status: mapping ? 'SUCCESS' : 'WARNING', // Controller에서 카운팅할 때 사용
      mappedProductId: mapping ? mapping.dbProductId : null,
      orderId: order.id,
    };
  }

  // [전체 조회]
  async findAll() {
    return await prisma.orderLine.findMany({
      include: {
        batch: true,
        mappedDbProduct: true
      },
      orderBy: { id: 'desc' },
    });
  }

  // [삭제]
  async remove(id: number) {
    return await prisma.orderLine.delete({ where: { id } });
  }
}