// src/supplier-product/supplier-product.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class CreateSupplierProductDto {
  supplierName: string;      
  roubizCode: string; 
  supplierProductCode?: string;
  supplierProductName?: string;
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

    // 2. 공급처 확인
    let supplier = await prisma.businessRole.findUnique({
      where: { businessName: dto.supplierName },
    });

    if (!supplier) {
      supplier = await prisma.businessRole.create({
        data: {
          businessName: dto.supplierName,
          isSupplier: true,
          clientGroup: 'DT', 
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
        supplierProductName: dto.supplierProductName || roubizProduct.name,
        costPrice: dto.costPrice,
        isPrimary: true,
      },
    });
  }

  async findAll() {
    return await prisma.supplierProduct.findMany({
      include: { 
        supplier: true, 
        roubizProduct: true 
      },
      orderBy: { id: 'desc' },
    });
  }

  async remove(id: number) {
    return await prisma.supplierProduct.delete({ where: { id } });
  }
}