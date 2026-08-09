import { IsEnum, IsUUID } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums';
import { OrderStatusList } from '../enum/order.enum';

export class ChangeOrderStatusDto {
  @IsUUID()
  id!: string;

  @IsEnum(OrderStatusList, {
    message: `Valid order status are: ${OrderStatusList.join(', ')}`,
  })
  status!: OrderStatus;
}
