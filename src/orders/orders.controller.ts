import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto, PaidOrderDto } from './dto';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);

    const paymentSession = await this.ordersService.createPaymentSession(
      order as OrderWithProducts,
    );

    return {
      order,
      paymentSession,
    };
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.changeStatus(changeOrderStatusDto);
  }

  // Allows listen events from payments microservice to mark the order as paid
  @EventPattern('payment.succeeded')
  paymentSucceeded(@Payload() paidOrderDto: PaidOrderDto) {
    return this.ordersService.markOrderAsPaid(paidOrderDto);
  }

  // Allows listen events from payments microservice to mark the order as cancelled
  // For simplicity, we consider that if the payment fails, the order should be cancelled.
  // In a real-world scenario, you might want to handle this differently
  // (failed payments could be retried, or the user could be notified to try again).
  @EventPattern('payment.failed')
  paymentFailed(@Payload() payload: { orderId: string; reason?: string }) {
    return this.ordersService.markOrderAsCancelled(payload);
  }
}
