// src/order/order.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class OrderService {
  
  // [주문 생성]
  async create(dto: CreateOrderDto) {
    // 1. 판매처(Channel) 찾기
    const channel = await prisma.salesChannelType.findUnique({
      where: { name: dto.channelName },
    });

    if (!channel) {
      throw new NotFoundException(`'${dto.channelName}'라는 판매처를 찾을 수 없습니다. (DB에 등록된 채널만 주문 가능)`);
    }

    // 2. [자동화] 해당 채널용 'BusinessRole'이 없으면 임시로 생성 (FK 에러 방지용)
    // 원래는 미리 세팅해야 하지만, 편의상 자동 생성합니다.
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

    // 3. [배치 생성] API 주문을 담을 '주문 묶음(Batch)' 생성
    // 엑셀 업로드가 아니므로 1개짜리 미니 배치를 만듭니다.
    const batch = await prisma.orderUploadBatch.create({
      data: {
        clientRoleId: businessRole.id,
        originalFileName: 'API_Order_Input', // 파일명이 없으니 API 입력이라고 표시
      },
    });

    // 4. [주문 저장] 실제 주문 라인 생성
    const order = await prisma.orderLine.create({
      data: {
        batchId: batch.id, // 위에서 만든 배치에 소속됨
        externalOrderNo: dto.orderNo,
        salesProductCode: dto.productCode,
        quantity: dto.quantity,
        isSettled: false, // 정산 아직 안 됨
      },
    });

    return {
      message: '주문이 정상적으로 접수되었습니다.',
      channel: `${channel.name} (${channel.group})`, // ST인지 DT인지 확인 가능
      orderId: order.id,
    };
  }

  // [전체 조회]
  async findAll() {
    return await prisma.orderLine.findMany({
      include: {
        batch: true, // 어떤 배치(채널)에서 들어왔는지 같이 보기
      },
      orderBy: { id: 'desc' },
    });
  }

  // [삭제]
  async remove(id: number) {
    return await prisma.orderLine.delete({ where: { id } });
  }
}