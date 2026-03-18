import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon,
  TrendingUp,
  Package,
  DollarSign,
  Users,
  Loader2
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useOrders, useInventory, useTransactions, useCustomers } from '@/hooks/useSupabaseData';
import * as XLSX from 'xlsx';

const Reports = () => {
  const [dateRange, setDateRange] = useState<'week' | 'month' | '3months' | 'year'>('month');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const { orders, loading: ordersLoading } = useOrders();
  const { items: inventory, loading: inventoryLoading } = useInventory();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { customers, loading: customersLoading } = useCustomers();

  const loading = ordersLoading || inventoryLoading || transactionsLoading || customersLoading;

  // حساب البيانات للتقارير
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at || '');
    return orderDate >= startDate && orderDate <= endDate;
  });

  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.created_at || '');
    return txDate >= startDate && txDate <= endDate;
  });

  // بيانات المبيعات اليومية
  const salesData = filteredOrders.reduce((acc: any[], order) => {
    const date = format(new Date(order.created_at || ''), 'MM/dd', { locale: ar });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.sales += order.price;
      existing.orders += 1;
    } else {
      acc.push({ date, sales: order.price, orders: 1 });
    }
    return acc;
  }, []);

  // بيانات حالات الطلبات
  const orderStatusData = [
    { name: 'جديد', value: orders.filter(o => o.status === 'new').length, color: '#3B82F6' },
    { name: 'تصميم', value: orders.filter(o => o.status === 'design').length, color: '#F59E0B' },
    { name: 'طباعة', value: orders.filter(o => o.status === 'printing').length, color: '#8B5CF6' },
    { name: 'مطبوع', value: orders.filter(o => o.status === 'printed').length, color: '#10B981' },
    { name: 'بالخارج', value: orders.filter(o => o.status === 'waiting_outside').length, color: '#EF4444' },
    { name: 'تم التسليم', value: orders.filter(o => o.status === 'delivered').length, color: '#06B6D4' },
  ].filter(item => item.value > 0);

  // بيانات المخزون حسب الفئة
  const inventoryByCategory = inventory.reduce((acc: any[], item) => {
    const existing = acc.find(cat => cat.name === item.category);
    if (existing) {
      existing.value += item.quantity;
      existing.totalValue += item.quantity * item.purchase_price;
    } else {
      acc.push({ 
        name: item.category, 
        value: item.quantity,
        totalValue: item.quantity * item.purchase_price
      });
    }
    return acc;
  }, []);

  // بيانات الإيرادات والمصروفات
  const incomeExpenseData = filteredTransactions.reduce((acc: any[], tx) => {
    const date = format(new Date(tx.created_at || ''), 'MM/dd', { locale: ar });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      if (tx.type === 'income') {
        existing.income += tx.amount;
      } else {
        existing.expense += tx.amount;
      }
    } else {
      acc.push({ 
        date, 
        income: tx.type === 'income' ? tx.amount : 0,
        expense: tx.type === 'expense' ? tx.amount : 0
      });
    }
    return acc;
  }, []);

  // أفضل العملاء
  const topCustomers = [...customers]
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  // المنتجات منخفضة المخزون
  const lowStockItems = inventory.filter(item => item.quantity <= item.alert_threshold);

  // الإحصائيات العامة
  const totalSales = filteredOrders.reduce((sum, order) => sum + order.price, 0);
  const totalPaid = filteredOrders.reduce((sum, order) => sum + order.paid, 0);
  const totalRemaining = totalSales - totalPaid;
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // تصدير Excel
  const exportToExcel = (type: 'sales' | 'inventory' | 'financial') => {
    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'sales':
        data = filteredOrders.map(order => ({
          'رقم الطلب': order.order_number,
          'العميل': order.customer_name,
          'نوع العمل': order.work_type,
          'الكمية': order.quantity,
          'السعر': order.price,
          'المدفوع': order.paid,
          'المتبقي': order.remaining,
          'الحالة': order.status,
          'التاريخ': format(new Date(order.created_at || ''), 'yyyy-MM-dd')
        }));
        filename = `تقرير_المبيعات_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        break;
      case 'inventory':
        data = inventory.map(item => ({
          'الكود': item.code,
          'الاسم': item.name,
          'الفئة': item.category,
          'الكمية': item.quantity,
          'الوحدة': item.unit,
          'سعر الشراء': item.purchase_price,
          'القيمة الإجمالية': item.quantity * item.purchase_price,
          'حد التنبيه': item.alert_threshold
        }));
        filename = `تقرير_المخزون_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        break;
      case 'financial':
        data = filteredTransactions.map(tx => ({
          'النوع': tx.type === 'income' ? 'إيراد' : 'مصروف',
          'الفئة': tx.category,
          'المبلغ': tx.amount,
          'الوصف': tx.description,
          'طريقة الدفع': tx.payment_method,
          'التاريخ': format(new Date(tx.created_at || ''), 'yyyy-MM-dd')
        }));
        filename = `تقرير_مالي_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        break;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
    XLSX.writeFile(wb, filename);
  };

  const handleDateRangeChange = (range: 'week' | 'month' | '3months' | 'year') => {
    setDateRange(range);
    const now = new Date();
    switch (range) {
      case 'week':
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case 'month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case '3months':
        setStartDate(startOfMonth(subMonths(now, 2)));
        setEndDate(endOfMonth(now));
        break;
      case 'year':
        setStartDate(new Date(now.getFullYear(), 0, 1));
        setEndDate(new Date(now.getFullYear(), 11, 31));
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير المتقدمة</h1>
          <p className="text-muted-foreground">تحليل شامل للمبيعات والمخزون والمالية</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v: any) => handleDateRangeChange(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">آخر أسبوع</SelectItem>
              <SelectItem value="month">هذا الشهر</SelectItem>
              <SelectItem value="3months">آخر 3 أشهر</SelectItem>
              <SelectItem value="year">هذا العام</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                <p className="text-xl font-bold text-foreground">{totalSales.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className="text-xl font-bold text-foreground">{netProfit.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Package className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">أصناف منخفضة</p>
                <p className="text-xl font-bold text-foreground">{lowStockItems.length} صنف</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Users className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المستحقات</p>
                <p className="text-xl font-bold text-foreground">{totalRemaining.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales">تقارير المبيعات</TabsTrigger>
          <TabsTrigger value="inventory">تقارير المخزون</TabsTrigger>
          <TabsTrigger value="financial">التقارير المالية</TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => exportToExcel('sales')} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              تصدير Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">المبيعات اليومية</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} ج.م`} />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">حالات الطلبات</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">أفضل العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.total_orders} طلب</p>
                      </div>
                    </div>
                    <p className="font-bold text-primary">{customer.total_spent.toLocaleString()} ج.م</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => exportToExcel('inventory')} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              تصدير Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">المخزون حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={inventoryByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">قيمة المخزون حسب الفئة</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={inventoryByCategory}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="totalValue"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {inventoryByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} ج.م`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {lowStockItems.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-lg text-red-500">تنبيه: أصناف منخفضة المخزون</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="p-3 bg-background rounded-lg border border-red-500/20">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        الكمية: <span className="text-red-500 font-bold">{item.quantity}</span> / الحد: {item.alert_threshold}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => exportToExcel('financial')} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              تصدير Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-green-500">{totalIncome.toLocaleString()} ج.م</p>
              </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/20">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                <p className="text-2xl font-bold text-red-500">{totalExpense.toLocaleString()} ج.م</p>
              </CardContent>
            </Card>
            <Card className={`${netProfit >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">صافي الربح</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                  {netProfit.toLocaleString()} ج.م
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الإيرادات vs المصروفات</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={incomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value} ج.م`} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="الإيرادات" />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} name="المصروفات" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
