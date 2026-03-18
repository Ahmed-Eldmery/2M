export type OrderStatus = 'new' | 'design' | 'printing' | 'printed' | 'delivered';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: 'meter' | 'sqm' | 'piece';
  quantity: number;
  alertThreshold: number;
  purchasePrice: number;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
}

export interface PrintOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  workType: string;
  dimensions: string;
  quantity: number;
  price: number;
  paid: number;
  remaining: number;
  status: OrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  orderId?: string;
  createdAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  salary: number;
  phone?: string;
  hireDate: Date;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  type: 'salary' | 'advance' | 'deduction';
  amount: number;
  month: string;
  notes?: string;
  createdAt: Date;
}

export type UserRole = 'owner' | 'accountant' | 'designer' | 'printer' | 'warehouse';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
