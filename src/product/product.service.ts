// src/product/product.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const prisma = new PrismaClient();

@Injectable()
export class ProductService {
  
  // 1. [등록] 상품 생성 (RoubizProduct)
  async create(dto: CreateProductDto) {
    return await prisma.roubizProduct.create({
      data: {
        roubizCode: dto.roubizCode, 
        name: dto.name,
        standardCost: dto.purchaseCost, 
        isSet: dto.isSet || false, 
        status: 'ACTIVE',
      },
    });
  }

  // 2. [전체 조회] 모든 상품 목록 가져오기
  async findAll() {
    return await prisma.roubizProduct.findMany({
      orderBy: { id: 'desc' }, 
      include: {
        childBundles: {
          include: { childProduct: true }
        }
      }
    });
  }

  // 3. [상세 조회] 특정 상품 조회
  async findOne(id: number) {
    return await prisma.roubizProduct.findUnique({
      where: { id },
      include: {
        childBundles: {
          include: { childProduct: true }
        }
      }
    });
  }

  // 4. [수정] 상품 정보 업데이트
  async update(id: number, dto: UpdateProductDto) {
    return await prisma.roubizProduct.update({
      where: { id },
      data: {
        name: dto.name,
        roubizCode: dto.roubizCode, 
        standardCost: dto.purchaseCost, 
        isSet: dto.isSet,
        status: dto.status,
      },
    });
  }

  // 5. [삭제] 상품 삭제
  async remove(id: number) {
    return await prisma.roubizProduct.delete({
      where: { id },
    });
  }
}