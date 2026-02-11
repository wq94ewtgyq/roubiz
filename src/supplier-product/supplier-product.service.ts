import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SupplierProductService {
  async create(dto: CreateSupplierProductDto) {
    // 1. 공급사 확인
    let supplier = await prisma.supplier.findFirst({ where: { name: dto.supplierName } });
    
    if (!supplier) {
       // 비즈니스 ID 임시 지정
       const biz = await prisma.business.findFirst(); 
       
       // ★ [Fix] biz가 없을 경우에 대한 예외 처리 추가
       if (!biz) {
         throw new NotFoundException('기본 Business(사업자) 정보가 없습니다. DB 시딩을 확인하세요.');
       }

       supplier = await prisma.supplier.create({
         data: { 
           businessId: biz.id,
           name: dto.supplierName,
         }
       });
    }

    // 2. 상품 확인
    const product = await prisma.roubizProduct.findUnique({ where: { roubizCode: dto.roubizCode } });
    if (!product) throw new NotFoundException('상품코드 없음');

    // 3. 연결
    return await prisma.supplierProduct.create({
      data: {
        supplierId: supplier.id,
        roubizProductId: product.id,
        costPrice: dto.costPrice,
        isPrimary: dto.isPrimary || false,
      }
    });
  }

  async findAll() {
    return await prisma.supplierProduct.findMany({ include: { supplier: true, roubizProduct: true } });
  }

  async update(id: number, dto: UpdateSupplierProductDto) {
    return await prisma.supplierProduct.update({
      where: { id },
      data: { costPrice: dto.costPrice, isPrimary: dto.isPrimary }
    });
  }

  async remove(id: number) {
    return await prisma.supplierProduct.delete({ where: { id } });
  }
}