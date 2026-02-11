import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class CarrierService {
  async findAll() {
    return await prisma.carrier.findMany();
  }

  async create(data: any) {
    return await prisma.carrier.create({ data });
  }

  async remove(id: number) {
    return await prisma.carrier.delete({ where: { id } });
  }
}