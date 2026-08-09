import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../generated/prisma/client';

export class CreateOrderDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  totalAmount!: number;
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  totalItems!: number;
  @IsEnum(OrderStatusList, {
    message: `Status must be one of the following: ${Object.values(OrderStatusList).join(', ')}`,
  })
  @IsOptional()
  status?: OrderStatus = OrderStatus.PENDING;
  @IsBoolean()
  @IsOptional()
  paid?: boolean = false;
}
