import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseProductService } from './purchase-product.service';

describe('PurchaseProductService', () => {
  let service: PurchaseProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PurchaseProductService],
    }).compile();

    service = module.get<PurchaseProductService>(PurchaseProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
