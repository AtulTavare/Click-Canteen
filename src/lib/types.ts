export type Role = 'student' | 'manager';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: number;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
  available: boolean;
  orderCount: number;
}

export interface Table {
  id: string;
  name: string;
  active: boolean;
  lastScannedAt?: number;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  validTill: number;
  active: boolean;
  clickCount: number;
  createdAt: number;
}

export type OrderStatus = 'Scheduled' | 'Placed' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
export type PaymentMode = 'Counter' | 'Online';
export type PaymentStatus = 'Pending' | 'Paid';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  table: string;
  customerId: string;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  timePlaced: number;
  orderType?: 'now' | 'scheduled';
  scheduledTime?: number;
}
