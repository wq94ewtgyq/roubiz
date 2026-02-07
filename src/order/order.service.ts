import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient, RoubizOrder } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class OrderService {
  
  async create(dto: CreateOrderDto) {
    const safeOption = dto.optionName?.trim() || '옵션없음';

    const client = await prisma.businessRole.findUnique({
      where: { businessName: dto.channelName },
    });
    if (!client) throw new NotFoundException(`'${dto.channelName}' 판매처 없음`);

    // [STEP 1] Client Order 저장 (Input)
    const clientOrder = await prisma.clientOrder.create({
      data: {
        clientRoleId: client.id,
        clientOrderNo: dto.orderNo,
        productCode: dto.productCode,
        optionName: safeOption,
        quantity: dto.quantity,
        salesPrice: dto.price,
        orderDate: new Date(),
        isConverted: false,
      }
    });

    // [STEP 2] Roubiz Order 변환 (Hub)
    const mapping = await prisma.clientProductMapping.findUnique({
      where: {
        clientRoleId_clientProductCode_clientOptionName: {
          clientRoleId: client.id,
          clientProductCode: dto.productCode,
          clientOptionName: safeOption
        }
      },
      include: { roubizProduct: true }
    });

    // [해결] RoubizOrder 타입을 명시하여 null 대입 에러 방지
    let roubizOrder: RoubizOrder | null = null; 

    if (mapping) {
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
      
      roubizOrder = await prisma.roubizOrder.create({
        data: {
          clientOrderId: clientOrder.id,
          roubizOrderNo: `R-${dateStr}-${randomStr}`,
          roubizProductId: mapping.roubizProductId,
          quantity: dto.quantity,
          status: 'READY'
        }
      });

      await prisma.clientOrder.update({
        where: { id: clientOrder.id },
        data: { isConverted: true }
      });
    }

    return {
      message: '주문 접수 완료',
      status: mapping ? 'SUCCESS' : 'WARNING',
      matchResult: mapping ? `✅ ${mapping.roubizProduct.name}` : '⚠️ 매핑필요',
      roubizOrderNo: roubizOrder?.roubizOrderNo || null
    };
  }

  async findAll() {
    return await prisma.clientOrder.findMany({
      include: {
        roubizOrders: { include: { roubizProduct: true } }
      },
      orderBy: { id: 'desc' },
    });
  }

  async remove(id: number) {
    return await prisma.clientOrder.delete({ where: { id } });
  }
}
