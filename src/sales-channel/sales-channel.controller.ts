// src/sales-channel/sales-channel.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SalesChannelService } from './sales-channel.service';
import { SalesGroup } from '@prisma/client';

@Controller('sales-channel')
export class SalesChannelController {
  constructor(private readonly salesChannelService: SalesChannelService) {}

  @Get()
  findAll() {
    return this.salesChannelService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; group: SalesGroup; description?: string }) {
    return this.salesChannelService.create(body.name, body.group, body.description);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { group: SalesGroup }) {
    return this.salesChannelService.update(+id, body.group);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesChannelService.remove(+id);
  }
}