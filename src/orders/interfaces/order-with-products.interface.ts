import { OrderStatus } from '../../generated/prisma/client';

export interface OrderWithProducts {
  id: string;
  totalAmount: number;
  totalItems: number;
  status: OrderStatus;
  paid: boolean;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  OrderItem: {
    name: string | undefined;
    price: number;
    productId: number;
    quantity: number;
  }[];
}
