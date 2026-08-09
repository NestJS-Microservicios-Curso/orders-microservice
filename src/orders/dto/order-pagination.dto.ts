import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { PaginationDto } from '../../common';
import { OrderStatus } from '../../generated/prisma/client';

export class OrderPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatusList, {
    message: `Valid order status are: ${Object.values(OrderStatusList).join(', ')}`,
  })
  status?: OrderStatus;
}
