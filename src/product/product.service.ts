import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ProductService {

  // ─────────────────────────────────────
  // 코드 자동 채번 (R#####)
  // ─────────────────────────────────────

  private async generateRoubizCode(): Promise<string> {
    const last = await prisma.roubizProduct.findFirst({
      where:   { roubizCode: { startsWith: 'R' } },
      orderBy: { roubizCode: 'desc' },
    });
    const lastNum = last ? parseInt(last.roubizCode.replace('R', ''), 10) : 0;
    return `R${String(lastNum + 1).padStart(5, '0')}`;
  }

  // ─────────────────────────────────────
  // [1] 매입상품 CRUD
  // ─────────────────────────────────────

  async create(dto: {
    roubizCode?:    string;
    name:           string;
    optionName?:    string;
    productType?:   string;
    category?:      string;
    subCategory?:   string;
    item?:          string;
    brand?:         string;
    standardCost?:  number;
    shippingFeeType?:string;
    shippingFee?:   number;
    boxShippingFee?:number;
    boxQuantity?:   number;
    remoteAreaFee?: number;
    returnCost?:    number;
    isSeasonal?:    boolean;
    seasonType?:    string;
  }) {
    const code = dto.roubizCode ?? await this.generateRoubizCode();
    const { roubizCode: _skip, ...rest } = dto;
    return prisma.roubizProduct.create({ data: { roubizCode: code, ...rest } });
  }

  async findAll(filters?: { status?: string; category?: string; brand?: string }) {
    return prisma.roubizProduct.findMany({
      where: {
        ...(filters?.status   && { status:   filters.status }),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.brand    && { brand:    filters.brand }),
      },
      include: {
        stocks:          { include: { warehouse: true } },
        supplierProducts:{ include: { supplier: true } },
        clientMappings:  { include: { client: true } },
      },
      orderBy: { roubizCode: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await prisma.roubizProduct.findUnique({
      where: { id },
      include: {
        stocks:          { include: { warehouse: true } },
        supplierProducts:{ include: { supplier: true } },
        clientMappings:  { include: { client: true } },
      },
    });
    if (!product) throw new NotFoundException(`상품(ID:${id})를 찾을 수 없습니다.`);
    return product;
  }

  async update(id: number, dto: Record<string, any>) {
    await this.findOne(id);
    return prisma.roubizProduct.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return prisma.roubizProduct.delete({ where: { id } });
  }

  // ─────────────────────────────────────
  // 세트상품 코드 채번 (SR#####)
  // ─────────────────────────────────────

  private async generateSetCode(): Promise<string> {
    const last = await prisma.setProduct.findFirst({
      where:   { setCode: { startsWith: 'SR' } },
      orderBy: { setCode: 'desc' },
    });
    const lastNum = last ? parseInt(last.setCode.replace('SR', ''), 10) : 0;
    return `SR${String(lastNum + 1).padStart(5, '0')}`;
  }

  // ─────────────────────────────────────
  // [2] 세트상품 CRUD
  // ─────────────────────────────────────

  async createSetProduct(dto: {
    setCode?:   string;
    setType:    string;
    name:       string;
    brand?:     string;
    shippingFee?:number;
    boxQuantity?:number;
    items: { roubizProductId: number; quantity: number }[];
  }) {
    const setCode = dto.setCode ?? await this.generateSetCode();

    // totalCost 자동계산: 구성 상품의 standardCost * quantity 합산
    const productIds = dto.items.map(i => i.roubizProductId);
    const products   = await prisma.roubizProduct.findMany({
      where: { id: { in: productIds } },
    });

    const totalCost = dto.items.reduce((sum, item) => {
      const p = products.find(p => p.id === item.roubizProductId);
      const cost = p?.standardCost ? Number(p.standardCost) : 0;
      return sum + cost * item.quantity;
    }, 0);

    return prisma.setProduct.create({
      data: {
        setCode,
        setType:    dto.setType,
        name:       dto.name,
        brand:      dto.brand,
        totalCost,
        shippingFee:dto.shippingFee,
        boxQuantity:dto.boxQuantity,
        items: { create: dto.items },
      },
      include: { items: { include: { roubizProduct: true } } },
    });
  }

  async findAllSetProducts() {
    return prisma.setProduct.findMany({
      include: { items: { include: { roubizProduct: true } } },
      orderBy: { setCode: 'asc' },
    });
  }

  async findOneSetProduct(id: number) {
    const set = await prisma.setProduct.findUnique({
      where:   { id },
      include: { items: { include: { roubizProduct: true } } },
    });
    if (!set) throw new NotFoundException(`세트상품(ID:${id})를 찾을 수 없습니다.`);
    return set;
  }

  async updateSetProduct(id: number, dto: Record<string, any>) {
    await this.findOneSetProduct(id);
    const { items: _items, ...rest } = dto;
    return prisma.setProduct.update({ where: { id }, data: rest });
  }
}
