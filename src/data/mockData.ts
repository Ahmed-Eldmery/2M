import { InventoryItem, Customer, PrintOrder, Transaction, Employee } from '@/types';

export const mockInventory: InventoryItem[] = [
  { id: '1', name: 'فلكس 440 جرام', category: 'بنرات', unit: 'sqm', quantity: 150, alertThreshold: 20, purchasePrice: 25, createdAt: new Date() },
  { id: '2', name: 'فينيل لاصق أبيض', category: 'فينيل', unit: 'sqm', quantity: 80, alertThreshold: 15, purchasePrice: 35, createdAt: new Date() },
  { id: '3', name: 'خشب MDF 3مم', category: 'خشب', unit: 'piece', quantity: 45, alertThreshold: 10, purchasePrice: 120, createdAt: new Date() },
  { id: '4', name: 'أكريليك شفاف 3مم', category: 'أكريليك', unit: 'piece', quantity: 30, alertThreshold: 8, purchasePrice: 180, createdAt: new Date() },
  { id: '5', name: 'حبر سماوي Eco', category: 'أحبار', unit: 'piece', quantity: 5, alertThreshold: 3, purchasePrice: 450, createdAt: new Date() },
  { id: '6', name: 'حبر ماجنتا Eco', category: 'أحبار', unit: 'piece', quantity: 4, alertThreshold: 3, purchasePrice: 450, createdAt: new Date() },
  { id: '7', name: 'ستيكر مقصوص', category: 'فينيل', unit: 'sqm', quantity: 12, alertThreshold: 10, purchasePrice: 45, createdAt: new Date() },
  { id: '8', name: 'قماش بلاك آوت', category: 'أقمشة', unit: 'sqm', quantity: 60, alertThreshold: 15, purchasePrice: 55, createdAt: new Date() },
];

export const mockCustomers: Customer[] = [
  { id: '1', name: 'شركة النور للمقاولات', phone: '01012345678', notes: 'عميل VIP', totalOrders: 45, totalSpent: 125000, createdAt: new Date('2023-01-15') },
  { id: '2', name: 'مطعم الشرق', phone: '01198765432', totalOrders: 12, totalSpent: 8500, createdAt: new Date('2023-06-20') },
  { id: '3', name: 'محمد عبدالله', phone: '01045678901', notes: 'يفضل التسليم السريع', totalOrders: 8, totalSpent: 3200, createdAt: new Date('2024-02-10') },
  { id: '4', name: 'مؤسسة الفجر التجارية', phone: '01234567890', totalOrders: 28, totalSpent: 67000, createdAt: new Date('2022-11-05') },
  { id: '5', name: 'صالون ليالي', phone: '01123456789', totalOrders: 6, totalSpent: 4800, createdAt: new Date('2024-05-18') },
];

export const mockOrders: PrintOrder[] = [
  { id: '1', orderNumber: 'ORD-2024-001', customerId: '1', customerName: 'شركة النور للمقاولات', workType: 'بنر خارجي', dimensions: '5م × 2م', quantity: 2, price: 1200, paid: 1200, remaining: 0, status: 'delivered', createdAt: new Date('2024-01-10'), updatedAt: new Date('2024-01-12') },
  { id: '2', orderNumber: 'ORD-2024-002', customerId: '2', customerName: 'مطعم الشرق', workType: 'لوحة محل', dimensions: '3م × 1م', quantity: 1, price: 2500, paid: 1500, remaining: 1000, status: 'printing', createdAt: new Date('2024-01-11'), updatedAt: new Date('2024-01-11') },
  { id: '3', orderNumber: 'ORD-2024-003', customerId: '3', customerName: 'محمد عبدالله', workType: 'كروت شخصية', dimensions: '9سم × 5سم', quantity: 500, price: 350, paid: 350, remaining: 0, status: 'printed', createdAt: new Date('2024-01-12'), updatedAt: new Date('2024-01-12') },
  { id: '4', orderNumber: 'ORD-2024-004', customerId: '4', customerName: 'مؤسسة الفجر التجارية', workType: 'ستاند رول أب', dimensions: '85سم × 200سم', quantity: 3, price: 900, paid: 500, remaining: 400, status: 'design', createdAt: new Date('2024-01-13'), updatedAt: new Date('2024-01-13') },
  { id: '5', orderNumber: 'ORD-2024-005', customerId: '5', customerName: 'صالون ليالي', workType: 'ليزر أكريليك', dimensions: '40سم × 60سم', quantity: 1, price: 450, paid: 0, remaining: 450, status: 'new', createdAt: new Date('2024-01-14'), updatedAt: new Date('2024-01-14') },
  { id: '6', orderNumber: 'ORD-2024-006', customerId: '1', customerName: 'شركة النور للمقاولات', workType: 'يافطة مضيئة', dimensions: '4م × 1.5م', quantity: 1, price: 8500, paid: 4000, remaining: 4500, status: 'design', createdAt: new Date('2024-01-14'), updatedAt: new Date('2024-01-14') },
];

export const mockTransactions: Transaction[] = [
  { id: '1', type: 'income', category: 'مبيعات', amount: 1200, description: 'تحصيل طلب ORD-2024-001', orderId: '1', createdAt: new Date('2024-01-12') },
  { id: '2', type: 'income', category: 'مبيعات', amount: 1500, description: 'دفعة أولى طلب ORD-2024-002', orderId: '2', createdAt: new Date('2024-01-11') },
  { id: '3', type: 'expense', category: 'خامات', amount: 2500, description: 'شراء فلكس وفينيل', createdAt: new Date('2024-01-10') },
  { id: '4', type: 'expense', category: 'مرتبات', amount: 8000, description: 'رواتب شهر ديسمبر', createdAt: new Date('2024-01-01') },
  { id: '5', type: 'expense', category: 'إيجار', amount: 5000, description: 'إيجار المحل - يناير', createdAt: new Date('2024-01-05') },
  { id: '6', type: 'income', category: 'مبيعات', amount: 350, description: 'تحصيل كروت شخصية', orderId: '3', createdAt: new Date('2024-01-12') },
  { id: '7', type: 'expense', category: 'صيانة', amount: 800, description: 'صيانة ماكينة الطباعة', createdAt: new Date('2024-01-08') },
];

export const mockEmployees: Employee[] = [
  { id: '1', name: 'أحمد محمد السيد', position: 'مصمم جرافيك', salary: 6000, phone: '01012345678', hireDate: new Date('2022-03-15') },
  { id: '2', name: 'خالد عبدالرحمن', position: 'فني طباعة', salary: 5500, phone: '01198765432', hireDate: new Date('2021-08-01') },
  { id: '3', name: 'سعيد حسن علي', position: 'فني تركيب', salary: 4500, phone: '01045678901', hireDate: new Date('2023-01-10') },
  { id: '4', name: 'فاطمة أحمد', position: 'محاسبة', salary: 5000, phone: '01234567890', hireDate: new Date('2022-06-20') },
];

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    new: 'جديد',
    design: 'قيد التصميم',
    printing: 'قيد الطباعة',
    printed: 'تم الطباعة',
    delivered: 'تم التسليم',
  };
  return labels[status] || status;
};

export const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    new: 'status-new',
    design: 'status-design',
    printing: 'status-printing',
    printed: 'status-printed',
    delivered: 'status-delivered',
  };
  return classes[status] || '';
};

export const categories = ['بنرات', 'فينيل', 'خشب', 'أكريليك', 'أحبار', 'أقمشة', 'ورق', 'أخرى'];
export const workTypes = ['بنر خارجي', 'بنر داخلي', 'لوحة محل', 'ستاند رول أب', 'كروت شخصية', 'ليزر خشب', 'ليزر أكريليك', 'طباعة ورق', 'ستيكر', 'أخرى'];
export const expenseCategories = ['خامات', 'مرتبات', 'إيجار', 'صيانة', 'كهرباء', 'مياه', 'نثريات', 'أخرى'];

// Currency helper
export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('ar-EG')} ج.م`;
};
