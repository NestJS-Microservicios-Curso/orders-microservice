import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeOrderStatusDto, CreateOrderDto, PaidOrderDto } from './dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { NATS_SERVICE } from '../config';
import { catchError, firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';
import { OrderStatus } from './enum/order.enum';

interface ValidatedProduct {
  id: number;
  price: number;
  name: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NATS_SERVICE)
    private readonly client: ClientProxy, // Injecting the NATS client proxy to communicate with the products microservice
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    // Extracting product IDs from the order items
    const productsIds = createOrderDto.items.map((item) => item.productId);

    // Sending a message to the products microservice to check if the products exist
    interface ValidatedProduct {
      id: number;
      price: number;
      name: string;
    }

    const validateProductsResponse = await firstValueFrom(
      this.client
        .send<ValidatedProduct[]>({ cmd: 'validate_products' }, productsIds)
        .pipe(
          catchError((error: unknown) => {
            const err = error as { message?: string };
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              error: 'Bad Request',
              message: err.message || 'Error validating products',
            });
          }),
        ),
    );

    // Validating the response from the products microservice
    if (
      !validateProductsResponse ||
      validateProductsResponse.length !== productsIds.length
    ) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'One or more products do not exist',
      });
    }

    const totalAmount = createOrderDto.items.reduce((total, item) => {
      const product = validateProductsResponse.find(
        (product) => product.id === item.productId,
      );

      return total + (product?.price ?? 0) * item.quantity;
    }, 0);

    const totalItems = createOrderDto.items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    // Creating transactional order creation with total amount, total items and order items
    // Its a transactional operation, so each order item must be created in its own table, and the total amount and total items must be stored in the order table
    const order = await this.prisma.order.create({
      data: {
        totalAmount,
        totalItems,
        OrderItem: {
          create: createOrderDto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: validateProductsResponse.find(
              (product) => product.id === item.productId,
            )!.price,
          })),
        },
      },
      include: {
        OrderItem: {
          select: {
            quantity: true,
            price: true,
            productId: true,
          },
        },
      },
    });

    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => ({
        ...item,
        name: validateProductsResponse.find(
          (product) => product.id === item.productId,
        )?.name,
      })),
    };
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const { page: currentPage, limit, status } = orderPaginationDto;

    const totalPages = await this.prisma.order.count({
      where: { status: status },
    });
    const lastPage = Math.ceil(totalPages / limit);

    return {
      data: await this.prisma.order.findMany({
        skip: (currentPage - 1) * limit,
        take: limit,
        where: { status: status },
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: lastPage,
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            quantity: true,
            price: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `Order with id #${id} not found`,
      });
    }

    const productsIds = order.OrderItem.map((orderItem) => orderItem.productId);

    const validateProductsResponse = await firstValueFrom(
      this.client
        .send<ValidatedProduct[]>({ cmd: 'validate_products' }, productsIds)
        .pipe(
          catchError((error: unknown) => {
            const err = error as { message?: string };
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              error: 'Bad Request',
              message: err.message || 'Error validating products',
            });
          }),
        ),
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((item) => ({
        ...item,
        name: validateProductsResponse.find(
          (product) => product.id === item.productId,
        )?.name,
      })),
    };
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    return await this.prisma.order.update({
      where: { id: id },
      data: { status: status },
    });
  }

  async createPaymentSession(order: OrderWithProducts) {
    return await firstValueFrom(
      this.client
        .send('create.payment.session', {
          orderId: order.id,
          currency: 'usd',
          items: order.OrderItem.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        })
        .pipe(
          catchError((error: unknown) => {
            const err = error as { message?: string };
            throw new RpcException({
              status: HttpStatus.BAD_REQUEST,
              error: 'Bad Request',
              message: err.message || 'Error creating payment session',
            });
          }),
        ),
    );
  }

  async markOrderAsPaid(paidOrderDto: PaidOrderDto) {
    this.logger.log(`Marking order ${paidOrderDto.orderId} as paid`);

    const order = await this.findOne(paidOrderDto.orderId);

    if (order.status === OrderStatus.PAID) {
      return order;
    }

    return await this.prisma.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: OrderStatus.PAID,
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,

        // Relationship 1-TO-1 with OrderReceipt. Transactional when an order is marked as paid, we create a new OrderReceipt record with the receiptUrl from the payment microservice
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl,
          },
        },
      },
    });
  }

  async markOrderAsCancelled(payload: { orderId: string; reason?: string }) {
    this.logger.warn(
      `Marking order ${payload.orderId} as CANCELLED. Reason: ${payload.reason || 'Payment failed'}`,
    );
    const order = await this.findOne(payload.orderId);
    if (order.status === OrderStatus.CANCELLED) {
      return order;
    }
    return await this.prisma.order.update({
      where: { id: payload.orderId },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });
  }
}
