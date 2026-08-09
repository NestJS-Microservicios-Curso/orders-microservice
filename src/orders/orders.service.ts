import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeOrderStatusDto, CreateOrderDto } from './dto';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    try {
      return await this.prisma.order.create({
        data: createOrderDto,
      });
    } catch (error: unknown) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: (error as Error).message,
      });
    }
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
    const order = await this.prisma.order.findFirst({ where: { id } });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        message: `Order with id #${id} not found`,
      });
    }

    return order;
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
}
