import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class BusinessService {

  // ─────────────────────────────────────
  // [1] 사업자 CRUD
  // ─────────────────────────────────────

  async findAll() {
    return prisma.business.findMany({
      include: {
        clients:   { select: { id: true, name: true, displayName: true, dealStatus: true } },
        suppliers: { select: { id: true, name: true, displayName: true, dealStatus: true } },
        warehouses:{ select: { id: true, name: true, warehouseCode: true, dealStatus: true } },
        _count:    { select: { contacts: true } },
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        clients:   true,
        suppliers: true,
        warehouses:true,
        contacts:  { orderBy: { contactDate: 'desc' } },
      },
    });
    if (!business) throw new NotFoundException(`사업자(ID:${id})를 찾을 수 없습니다.`);
    return business;
  }

  async create(dto: {
    businessName:      string;
    displayName?:      string;
    businessType?:     string;
    businessRegNumber?:string;
    ownerName?:        string;
    bankName?:         string;
    bankAccount?:      string;
    bankAccountHolder?:string;
  }) {
    return prisma.business.create({ data: dto });
  }

  async update(id: number, dto: Record<string, any>) {
    await this.findOne(id);
    return prisma.business.update({ where: { id }, data: dto });
  }

  // ─────────────────────────────────────
  // [2] 컨택 타임라인
  // ─────────────────────────────────────

  async addContact(businessId: number, dto: {
    contactDate: string;
    contactType: string;
    summary:     string;
    staffName?:  string;
  }) {
    await this.findOne(businessId);
    return prisma.contactHistory.create({
      data: {
        businessId,
        contactDate: new Date(dto.contactDate),
        contactType: dto.contactType,
        summary:     dto.summary,
        staffName:   dto.staffName,
      },
    });
  }

  async getContacts(businessId: number) {
    await this.findOne(businessId);
    return prisma.contactHistory.findMany({
      where:   { businessId },
      orderBy: { contactDate: 'desc' },
    });
  }

  async updateContact(contactId: number, dto: Record<string, any>) {
    return prisma.contactHistory.update({ where: { id: contactId }, data: dto });
  }

  async deleteContact(contactId: number) {
    return prisma.contactHistory.delete({ where: { id: contactId } });
  }
}
