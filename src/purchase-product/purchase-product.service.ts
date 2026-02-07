// src/purchase-product/purchase-product.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Service 내부 DTO (변수명은 'purchase'로 유지 - 우리가 쓰기 편하게)
interface CreatePurchaseProductDto {
  purchaseName: string;
  dbProductCode: string; 
  purchaseProductCode?: string;
  purchaseProductName?: string;
  costPrice: number;
}

const prisma = new PrismaClient();

@Injectable()
export class PurchaseProductService {

  async create(dto: CreatePurchaseProductDto) {
    // 1. 우리 상품(DbProduct) 확인
    const dbProduct = await prisma.dbProduct.findUnique({
      where: { dbCode: dto.dbProductCode }, 
    });

    if (!dbProduct) {
      throw new NotFoundException(`상품코드(${dto.dbProductCode})가 시스템에 등록되지 않았습니다.`);
    }

    // 2. 매입처(BusinessRole) 확인 및 자동 생성
    let purchase = await prisma.businessRole.findUnique({
      where: { businessName: dto.purchaseName },
    });

    if (!purchase) {
      purchase = await prisma.businessRole.create({
        data: {
          businessName: dto.purchaseName,
          // [오류 수정 1] DB에는 'isSupplier'라는 컬럼만 존재합니다.
          isSupplier: true,         
          salesGroup: 'DT',         
          description: '자동 생성된 매입처',
        },
      });
    }

    // 3. 중복 확인
    const existing = await prisma.purchaseProduct.findUnique({
      where: {
        // [오류 수정 2] DB의 복합키 이름은 'supplierId_dbProductId' 입니다.
        supplierId_dbProductId: {
          supplierId: purchase.id, // DB 컬럼: supplierId <--- 값: purchase.id
          dbProductId: dbProduct.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`이미 해당 매입처(${dto.purchaseName})에 등록된 상품입니다.`);
    }

    // 4. 저장
    const purchaseProduct = await prisma.purchaseProduct.create({
      data: {
        // [오류 수정 3] DB 컬럼명에 맞춰서 매핑해줍니다.
        supplierId: purchase.id, 
        dbProductId: dbProduct.id,
        
        // 왼쪽(DB컬럼) = 오른쪽(DTO변수)
        supplierProductCode: dto.purchaseProductCode || '',
        supplierProductName: dto.purchaseProductName || dbProduct.name,
        costPrice: dto.costPrice,
        isPrimary: true, 
      },
    });

    return {
      message: '매입 상품 등록 완료',
      purchase: purchase.businessName,
      product: dbProduct.name,
      costPrice: purchaseProduct.costPrice,
    };
  }

  // [전체 조회]
  async findAll() {
    return await prisma.purchaseProduct.findMany({
      // [중요] 여기도 DB 관계명인 'supplier'를 써야 데이터를 가져옵니다.
      include: { supplier: true, dbProduct: true },
      orderBy: { id: 'desc' },
    });
  }

  async remove(id: number) {
    return await prisma.purchaseProduct.delete({ where: { id } });
  }
}