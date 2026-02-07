// src/supplier-product/supplier-product.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export class CreateSupplierProductDto {
  supplierName: string;      
  roubizCode: string; // [수정] dbProductCode -> roubizCode
  supplierProductCode?: string;
  supplierProductName?: string;
  costPrice: number;
}

const prisma = new PrismaClient();

@Injectable()
export class SupplierProductService { 

  async create(dto: CreateSupplierProductDto) {
    const roubizProduct = await prisma.roubizProduct.findUnique({
      where: { roubizCode: dto.roubizCode }, // [수정] roubizCode
    });
    
    if (!roubizProduct) throw new NotFoundException(`상품(${dto.roubizCode}) 없음`);

    let supplier = await prisma.businessRole.findUnique({
      where: { businessName: dto.supplierName },
    });

    if (!supplier) {
      supplier = await prisma.businessRole.create({
        data: {
          businessName: dto.supplierName,
          isSupplier: true,
          clientGroup: 'DT', 
          description: 'Auto-generated Supplier',
        },
      });
    }

    const existing = await prisma.supplierProduct.findUnique({
      where: {
        supplierId_roubizProductId: { 
          supplierId: supplier.id,
          roubizProductId: roubizProduct.id,
        },
      },
    });
    if (existing) throw new BadRequestException('이미 등록된 상품입니다.');

    const newProduct = await prisma.supplierProduct.create({
      data: {
        supplierId: supplier.id,
        roubizProductId: roubizProduct.id, 
        supplierProductCode: dto.supplierProductCode || '',
        supplierProductName: dto.supplierProductName || roubizProduct.name,
        costPrice: dto.costPrice,
        isPrimary: true,
      },
    });

    return newProduct;
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