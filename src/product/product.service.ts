// src/product/product.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const prisma = new PrismaClient();

@Injectable()
export class ProductService {
  
  async create(dto: CreateProductDto) {
    return await prisma.roubizProduct.create({
      data: {
        roubizCode: dto.roubizCode, // [확정] dbCode -> roubizCode
        name: dto.name,
        standardCost: dto.purchaseCost, 
        isSet: dto.isSet || false,  // [확정] isBundle -> isSet
        status: 'ACTIVE',
      },
    });
  }

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

  async update(id: number, dto: UpdateProductDto) {
    return await prisma.roubizProduct.update({
      where: { id },
      data: {
        name: dto.name,
        roubizCode: dto.roubizCode, // [확정] roubizCode
        standardCost: dto.purchaseCost, 
        isSet: dto.isSet,           // [확정] isSet
        status: dto.status,
      },
    });
  }

  async remove(id: number) {
    return await prisma.roubizProduct.delete({
      where: { id },
    });
  }
}