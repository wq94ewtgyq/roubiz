// src/supplier-product/supplier-product.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class CreateSupplierProductDto {
  supplierName: string;      
  roubizCode: string; 
  supplierProductCode?: string;
  // supplierProductName?: string; // [삭제] 스키마에서 제외됨
  costPrice: number;
}

const prisma = new PrismaClient();

@Injectable()
export class SupplierProductService { 

  async create(dto: CreateSupplierProductDto) {
    // 1. 루비즈 상품 확인
    const roubizProduct = await prisma.roubizProduct.findUnique({
      where: { roubizCode: dto.roubizCode }, 
    });
    if (!roubizProduct) throw new NotFoundException(`상품(${dto.roubizCode}) 없음`);

    // 2. 공급처(Supplier) 확인
    // [변경] BusinessRole -> Supplier
    let supplier = await prisma.supplier.findFirst({
      where: { name: dto.supplierName },
    });

    // [변경] 공급처가 없으면 자동 생성 (기본 사업자에 연결)
    if (!supplier) {
      const defaultBiz = await prisma.business.findFirst();
      if (!defaultBiz) throw new NotFoundException('기본 사업자 정보가 없습니다. 시드 데이터를 확인하세요.');

      supplier = await prisma.supplier.create({
        data: {
          businessId: defaultBiz.id, // 첫 번째 사업자에 소속시킴
          name: dto.supplierName,
          orderFormat: { type: 'STANDARD' }, // 기본값 설정
        },
      });
    }

    // 3. 중복 확인 (Prisma 유니크 키 규칙 적용)
    const existing = await prisma.supplierProduct.findUnique({
      where: {
        supplierId_roubizProductId: { 
          supplierId: supplier.id,
          roubizProductId: roubizProduct.id,
        },
      },
    });
    if (existing) throw new BadRequestException('이미 등록된 공급처 상품입니다.');

    // 4. 저장
    return await prisma.supplierProduct.create({
      data: {
        supplierId: supplier.id,
        roubizProductId: roubizProduct.id, 
        supplierProductCode: dto.supplierProductCode || '',
        // [삭제] supplierProductName 필드는 스키마에서 제거되었으므로 저장하지 않음
        costPrice: dto.costPrice,
        isPrimary: true,
      },
    });
  }

  async findAll() {
    return await prisma.supplierProduct.findMany({
      include: { 
        supplier: true, // [변경] supplier 관계 연결
        roubizProduct: true 
      },
      orderBy: { id: 'desc' },
    });
  }

  async remove(id: number) {
    return await prisma.supplierProduct.delete({ where: { id } });
  }
}