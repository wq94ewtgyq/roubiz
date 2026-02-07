import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseProductController } from './purchase-product.controller';
import { PurchaseProductService } from './purchase-product.service';

describe('PurchaseProductController', () => {
  let controller: PurchaseProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseProductController],
      providers: [PurchaseProductService],
    }).compile();

    controller = module.get<PurchaseProductController>(PurchaseProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
