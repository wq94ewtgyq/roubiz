// src/sales-product/sales-product.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SalesProductService {
  
  // [등록] 판매처 코드 <-> 우리 코드 연결
  async create(dto: { channelId: number; salesCode: string; salesOption: string; dbProductCode: string }) {
    
    // 1. 우리 상품(Master) 찾기
    const masterProduct = await prisma.dbProduct.findUnique({
      where: { dbCode: dto.dbProductCode }
    });
    if (!masterProduct) throw new NotFoundException(`마스터 상품(${dto.dbProductCode})을 찾을 수 없습니다.`);

    // 2. 판매처 역할(BusinessRole) 찾기 (간단히 ID로 조회)
    // 실제로는 채널ID로 BusinessRole을 찾는 로직이 더 정교해야 하지만, 여기선 직접 ID를 받는다고 가정
    const clientRole = await prisma.businessRole.findUnique({
      where: { id: dto.channelId }
    });
    if (!clientRole) throw new NotFoundException('존재하지 않는 판매처 ID입니다.');

    // 3. 매핑 저장
    return await prisma.salesProductMapping.create({
      data: {
        clientRoleId: dto.channelId,
        salesProductCode: dto.salesCode,
        salesOptionName: dto.salesOption,
        dbProductId: masterProduct.id,
      },
    });
  }

  // [조회] 전체 매핑 리스트
  async findAll() {
    return await prisma.salesProductMapping.findMany({
      include: {
        dbProduct: true, // 연결된 마스터 상품 정보도 같이 가져옴
        clientRole: true // 판매처 정보도 같이
      },
      orderBy: { id: 'desc' }
    });
  }

  // [삭제] 잘못된 매핑 삭제
  async remove(id: number) {
    return await prisma.salesProductMapping.delete({ where: { id } });
  }
}