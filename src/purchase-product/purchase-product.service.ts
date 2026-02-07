// src/purchase-product/purchase-product.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class PurchaseProductService {

  // [등록] 공급처 단가 등록
  async create(dto: { supplierName: string; dbProductCode: string; cost: number; supplierCode?: string }) {
    
    // 1. 우리 상품 찾기
    const masterProduct = await prisma.dbProduct.findUnique({
      where: { dbCode: dto.dbProductCode }
    });
    if (!masterProduct) throw new NotFoundException('마스터 상품을 찾을 수 없습니다.');

    // 2. 공급처(BusinessRole) 찾기 없으면 자동생성 (편의상)
    let supplier = await prisma.businessRole.findFirst({
      where: { businessName: dto.supplierName, isSupplier: true }
    });

    if (!supplier) {
      // 채널타입 1번(오픈마켓 등) 아무거나 연결해서 생성 (실제로는 더 정교해야 함)
      supplier = await prisma.businessRole.create({
        data: {
          businessName: dto.supplierName,
          channelTypeId: 1, // 임시 연결
          isSupplier: true,
        }
      });
    }

    // 3. 매입 정보 저장
    return await prisma.purchaseProduct.create({
      data: {
        supplierId: supplier.id,
        dbProductId: masterProduct.id,
        costPrice: dto.cost,
        supplierProductCode: dto.supplierCode,
        isPrimary: true,
      },
    });
  }

  // [조회]
  async findAll() {
    return await prisma.purchaseProduct.findMany({
      include: {
        supplier: true,
        dbProduct: true
      },
      orderBy: { id: 'desc' }
    });
  }
}