// src/product/product.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProductService {
  
  // 1. [등록] 상품 생성 (DB Code는 자동생성 로직이 필요하지만, 일단 입력받는 걸로 시작)
  async create(data: { name: string; dbCode: string; purchaseCost?: number }) {
    return await prisma.dbProduct.create({
      data: {
        name: data.name,
        dbCode: data.dbCode, // 예: R110001
        purchaseCost: data.purchaseCost,
        status: 'ACTIVE',
      },
    });
  }

  // 2. [전체 조회] 모든 상품 목록 가져오기
  async findAll() {
    return await prisma.dbProduct.findMany({
      orderBy: { id: 'desc' }, // 최신 등록순으로 정렬
    });
  }

  // 3. [상세 조회] 특정 상품 하나만 보기
  async findOne(id: number) {
    return await prisma.dbProduct.findUnique({
      where: { id },
    });
  }

  // 4. [수정] 상품 정보 고치기 (가격 변경 등)
  async update(id: number, data: { name?: string; purchaseCost?: number; status?: string }) {
    return await prisma.dbProduct.update({
      where: { id },
      data: {
        ...data, // 들어온 데이터만 수정
      },
    });
  }

  // 5. [삭제] 상품 삭제
  async remove(id: number) {
    return await prisma.dbProduct.delete({
      where: { id },
    });
  }
}