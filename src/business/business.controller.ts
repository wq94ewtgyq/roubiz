import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe } from '@nestjs/common';
import { BusinessService } from './business.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('거래처 관리 (Business)')
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  // ─────────────────────────────────────
  // 사업자 CRUD
  // ─────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '사업자 전체 목록 조회' })
  findAll() {
    return this.businessService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '사업자 상세 조회 (하위 판매처 / 매입처 / 창고 포함)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.businessService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '사업자 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['businessName'],
      properties: {
        businessName:       { type: 'string',  example: '(주)루비즈' },
        displayName:        { type: 'string',  example: '루비즈' },
        businessType:       { type: 'string',  example: '법인', description: '법인 | 개인 | 영세' },
        businessRegNumber:  { type: 'string',  example: '123-45-67890' },
        ownerName:          { type: 'string',  example: '홍길동' },
        bankName:           { type: 'string',  example: '신한은행' },
        bankAccount:        { type: 'string',  example: '110-123-456789' },
        bankAccountHolder:  { type: 'string',  example: '(주)루비즈' },
      },
    },
  })
  create(@Body() body: any) {
    return this.businessService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '사업자 정보 수정' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.businessService.update(id, body);
  }

  // ─────────────────────────────────────
  // 컨택 타임라인
  // ─────────────────────────────────────

  @Get(':id/contact')
  @ApiOperation({ summary: '컨택 이력 조회 (최신순)' })
  getContacts(@Param('id', ParseIntPipe) id: number) {
    return this.businessService.getContacts(id);
  }

  @Post(':id/contact')
  @ApiOperation({ summary: '컨택 이력 등록' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['contactDate', 'contactType', 'summary'],
      properties: {
        contactDate: { type: 'string', example: '2026-02-11',   description: 'YYYY-MM-DD' },
        contactType: { type: 'string', example: 'MEETING',      description: 'CALL | EMAIL | VISIT | PROPOSAL | MEETING' },
        summary:     { type: 'string', example: '신규 거래 제안 미팅 진행. 3월 론칭 예정.' },
        staffName:   { type: 'string', example: '김담당' },
      },
    },
  })
  addContact(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.businessService.addContact(id, body);
  }

  @Patch('contact/:contactId')
  @ApiOperation({ summary: '컨택 이력 수정' })
  updateContact(@Param('contactId', ParseIntPipe) contactId: number, @Body() body: any) {
    return this.businessService.updateContact(contactId, body);
  }

  @Delete('contact/:contactId')
  @ApiOperation({ summary: '컨택 이력 삭제' })
  deleteContact(@Param('contactId', ParseIntPipe) contactId: number) {
    return this.businessService.deleteContact(contactId);
  }
}
