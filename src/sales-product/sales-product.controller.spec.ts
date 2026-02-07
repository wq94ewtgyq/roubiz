import { Test, TestingModule } from '@nestjs/testing';
import { SalesProductController } from './sales-product.controller';
import { SalesProductService } from './sales-product.service';

describe('SalesProductController', () => {
  let controller: SalesProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SalesProductController],
      providers: [SalesProductService],
    }).compile();

    controller = module.get<SalesProductController>(SalesProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
