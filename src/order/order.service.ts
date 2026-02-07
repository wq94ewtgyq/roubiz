// src/order/order.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class OrderService {
  
  // [주문 생성]
  async create(dto: CreateOrderDto) {
    // 1. [옵션 정규화] 빈 칸만 '옵션없음'으로 치환 (데이터 클렌징)
    // "이상한 옵션"은 그대로 둡니다. 그래야 사람이 보고 판단하니까요.
    let safeOption = dto.optionName ? dto.optionName.trim() : '';
    if (safeOption === '') {
      safeOption = '옵션없음';
    }

    // 2. 판매처(Channel) 찾기
    const channel = await prisma.salesChannelType.findUnique({
      where: { name: dto.channelName },
    });
    if (!channel) throw new NotFoundException(`'${dto.channelName}' 판매처 없음`);

    // 3. 비즈니스 역할 찾기/생성
    let businessRole = await prisma.businessRole.findFirst({
      where: { channelTypeId: channel.id },
    });
    if (!businessRole) {
      businessRole = await prisma.businessRole.create({
        data: {
          businessName: `${channel.name}_기본계정`,
          channelTypeId: channel.id,
          isSalesChannel: true,
        },
      });
    }

    // -----------------------------------------------------------
    // [4. 매핑 조회 - 엄격 모드]
    // 2순위(대충 연결) 로직 삭제! 오직 정확히 일치할 때만 가져옵니다.
    // -----------------------------------------------------------
    const mapping = await prisma.salesProductMapping.findFirst({
      where: {
        clientRoleId: businessRole.id,
        salesProductCode: dto.productCode,
        salesOptionName: safeOption // 정확히 이 옵션명이어야 함
      }
    });

    // 5. 주문 묶음(Batch) 생성
    const batch = await prisma.orderUploadBatch.create({
      data: {
        clientRoleId: businessRole.id,
        originalFileName: 'API_Order_Input',
      },
    });

    // 6. 주문 저장
    const order = await prisma.orderLine.create({
      data: {
        batchId: batch.id,
        externalOrderNo: dto.orderNo,
        salesProductCode: dto.productCode,
        salesOptionName: safeOption,
        quantity: dto.quantity,
        
        // [핵심] 매핑 정보가 없으면 null로 저장 -> 이게 바로 '매핑필요' 상태
        mappedDbProductId: mapping ? mapping.dbProductId : null,
        
        isSettled: false,
      },
    });

    return {
      message: '주문 접수 완료',
      channel: channel.name,
      inputOption: safeOption,
      
      // [결과 리포트]
      status: mapping ? '✅ 자동매핑완료' : '⚠️ 매핑필요 (관리자 확인 요망)',
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