export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export const OrderStatusList = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];
