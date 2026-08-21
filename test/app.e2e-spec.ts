/**
 * E2E smoke tests for the orders-microservice.
 *
 * The real AppModule requires a live PostgreSQL database (Prisma), env vars,
 * and a NATS server. These are not available in a plain `npm run test:e2e`
 * run. Instead we build a minimal NestJS application that wires only the
 * OrdersController + a mock OrdersService so we can verify the message-pattern
 * handlers exist and delegate correctly — without any real infrastructure.
 */

// Mock envs before any module-level import triggers the Joi validation.
jest.mock('../src/config/envs', () => ({
  envs: {
    port: 3002,
    natsServers: ['nats://localhost:4222'],
  },
}));

// Mock the entire generated Prisma client so no .js ESM sub-module is resolved.
jest.mock('../src/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
  OrderStatus: {
    PENDING: 'PENDING',
    PAID: 'PAID',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

import { OrdersController } from '../src/orders/orders.controller';
import { OrdersService } from '../src/orders/orders.service';
import { NATS_SERVICE } from '../src/config';

// ── mocks ───────────────────────────────────────────────────────────────────

const mockOrdersService = {
  create: jest.fn().mockResolvedValue({ id: 'uuid-1', status: 'PENDING' }),
  createPaymentSession: jest
    .fn()
    .mockResolvedValue({ url: 'https://stripe.com/pay/test' }),
  findAll: jest
    .fn()
    .mockResolvedValue({ data: [], meta: { total: 0, page: 1, lastPage: 1 } }),
  findOne: jest.fn().mockResolvedValue({ id: 'uuid-1', status: 'PENDING' }),
  changeStatus: jest
    .fn()
    .mockResolvedValue({ id: 'uuid-1', status: 'DELIVERED' }),
  markOrderAsPaid: jest.fn().mockResolvedValue(undefined),
  markOrderAsCancelled: jest.fn().mockResolvedValue(undefined),
};

const mockNatsClient = {
  send: jest.fn(),
  emit: jest.fn(),
};

// ── suite ───────────────────────────────────────────────────────────────────

describe('OrdersController (e2e – isolated)', () => {
  let app: INestMicroservice;
  let controller: OrdersController;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: NATS_SERVICE, useValue: mockNatsClient },
      ],
    }).compile();

    // Use TCP so we do not need a real NATS server.
    app = moduleFixture.createNestMicroservice({ transport: Transport.TCP });
    await app.init();

    controller = moduleFixture.get<OrdersController>(OrdersController);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create delegates to OrdersService and returns order + paymentSession', async () => {
    const dto = { items: [{ productId: 1, quantity: 2, price: 10 }] };

    const result = await controller.create(dto as any);

    expect(mockOrdersService.create).toHaveBeenCalledWith(dto);
    expect(mockOrdersService.createPaymentSession).toHaveBeenCalled();
    expect(result).toHaveProperty('order');
    expect(result).toHaveProperty('paymentSession');
  });

  it('findAll delegates to OrdersService', async () => {
    const dto = { page: 1, limit: 10, status: undefined };

    const result = await controller.findAll(dto as any);

    expect(mockOrdersService.findAll).toHaveBeenCalledWith(dto);
    expect(result).toHaveProperty('data');
  });

  it('findOne delegates to OrdersService', async () => {
    const result = await controller.findOne('uuid-1');

    expect(mockOrdersService.findOne).toHaveBeenCalledWith('uuid-1');
    expect(result).toMatchObject({ id: 'uuid-1' });
  });

  it('changeOrderStatus delegates to OrdersService', async () => {
    const dto = { id: 'uuid-1', status: 'DELIVERED' };

    const result = await controller.changeOrderStatus(dto as any);

    expect(mockOrdersService.changeStatus).toHaveBeenCalledWith(dto);
    expect(result).toMatchObject({ status: 'DELIVERED' });
  });

  it('paymentSucceeded delegates to OrdersService.markOrderAsPaid', async () => {
    const dto = {
      orderId: 'uuid-1',
      stripePaymentId: 'ch_1',
      receiptUrl: 'https://r.url',
    };
    await controller.paymentSucceeded(dto as any);
    expect(mockOrdersService.markOrderAsPaid).toHaveBeenCalledWith(dto);
  });

  it('paymentFailed delegates to OrdersService.markOrderAsCancelled', async () => {
    const payload = { orderId: 'uuid-1', reason: 'Card declined' };
    await controller.paymentFailed(payload);
    expect(mockOrdersService.markOrderAsCancelled).toHaveBeenCalledWith(
      payload,
    );
  });
});
