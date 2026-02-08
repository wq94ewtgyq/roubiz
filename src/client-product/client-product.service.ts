import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class ClientProductService {

  // [1] 매핑 등록 (메서드명 create로 통일)
  async create(dto: { clientName: string, clientProductCode: string, clientOptionName: string, roubizProductId: number }) {
    // 1. Client(판매처) 조회
    const client = await prisma.client.findFirst({
      where: { name: dto.clientName },
    });

    if (!client) throw new NotFoundException(`'${dto.clientName}' Client(판매처)를 찾을 수 없습니다.`);

    // 2. 중복 체크
    // [Schema 변경사항 반영] unique 키 이름: client_product_option
    const exists = await prisma.clientProductMapping.findUnique({
      where: {
        client_product_option: { 
          clientId: client.id,
          clientProductCode: dto.clientProductCode,
          clientOptionName: dto.clientOptionName
        }
      }
    });

    if (exists) throw new BadRequestException('이미 등록된 매핑 정보입니다.');

    // 3. 매핑 생성
    return await prisma.clientProductMapping.create({
      data: {
        clientId: client.id, 
        clientProductCode: dto.clientProductCode,
        clientOptionName: dto.clientOptionName,
        roubizProductId: dto.roubizProductId
      }
    });
  }

  // [2] 매핑 목록 조회
  async findAll() {
    return await prisma.clientProductMapping.findMany({
      include: {
        client: true,       // [변경] salesChannel -> client
        roubizProduct: true
      },
      orderBy: { id: 'desc' }
    });
  }

  // [3] 매핑 삭제
  async remove(id: number) {
    return await prisma.clientProductMapping.delete({
      where: { id }
    });
  }
}