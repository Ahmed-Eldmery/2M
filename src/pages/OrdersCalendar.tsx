import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Loader2,
  FileText,
  User,
  Clock,
  GripVertical
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { useOrders } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const OrdersCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { orders, loading, fetchOrders } = useOrders();

  const statusColors: Record<string, string> = {
    new: 'bg-blue-500',
    design: 'bg-yellow-500',
    printing: 'bg-purple-500',
    printed: 'bg-green-500',
    waiting_outside: 'bg-red-500',
    delivered: 'bg-cyan-500'
  };

  const statusLabels: Record<string, string> = {
    new: 'جديد',
    design: 'تصميم',
    printing: 'طباعة',
    printed: 'مطبوع',
    waiting_outside: 'بالخارج',
    delivered: 'تم التسليم'
  };

  // Get calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 6 }); // Saturday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 6 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filterStatus === 'all') return true;
      return order.status === filterStatus;
    });
  }, [orders, filterStatus]);

  // Get orders for a specific day
  const getOrdersForDay = (day: Date) => {
    return filteredOrders.filter(order => {
      const orderDate = parseISO(order.created_at);
      return isSameDay(orderDate, day);
    });
  };

  // Navigation
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, order: any) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    
    if (!draggedOrder) return;

    try {
      const { error } = await supabase
        .from('print_orders')
        .update({ 
          created_at: targetDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', draggedOrder.id);

      if (error) throw error;

      toast({
        title: 'تم النقل',
        description: `تم نقل الطلب ${draggedOrder.order_number} إلى ${format(targetDate, 'dd MMMM yyyy', { locale: ar })}`
      });

      fetchOrders();
    } catch (error) {
      console.error('Error moving order:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء نقل الطلب',
        variant: 'destructive'
      });
    }

    setDraggedOrder(null);
  };

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

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
          <h1 className="text-2xl font-bold text-foreground">تقويم الطلبات</h1>
          <p className="text-muted-foreground">عرض وإدارة الطلبات على التقويم</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="جميع الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="new">جديد</SelectItem>
              <SelectItem value="design">تصميم</SelectItem>
              <SelectItem value="printing">طباعة</SelectItem>
              <SelectItem value="printed">مطبوع</SelectItem>
              <SelectItem value="waiting_outside">بالخارج</SelectItem>
              <SelectItem value="delivered">تم التسليم</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                اليوم
              </Button>
            </div>
            <CardTitle className="text-xl">
              {format(currentDate, 'MMMM yyyy', { locale: ar })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {filteredOrders.length} طلب
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayOrders = getOrdersForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border rounded-lg transition-colors ${
                    isCurrentMonth 
                      ? 'bg-background border-border' 
                      : 'bg-muted/30 border-transparent'
                  } ${isCurrentDay ? 'ring-2 ring-primary' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                  } ${isCurrentDay ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayOrders.slice(0, 3).map(order => (
                      <div
                        key={order.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, order)}
                        onClick={() => handleOrderClick(order)}
                        className={`p-1.5 rounded text-xs cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
                          statusColors[order.status]
                        } text-white`}
                      >
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3 h-3 opacity-50" />
                          <span className="truncate">{order.order_number}</span>
                        </div>
                      </div>
                    ))}
                    {dayOrders.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayOrders.length - 3} المزيد
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-4 justify-center">
            {Object.entries(statusLabels).map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${statusColors[status]}`} />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{selectedOrder.order_number}</span>
                <Badge className={`${statusColors[selectedOrder.status]} text-white`}>
                  {statusLabels[selectedOrder.status]}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">العميل</p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">نوع العمل</p>
                    <p className="font-medium">{selectedOrder.work_type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">تاريخ الإنشاء</p>
                    <p className="font-medium">
                      {format(parseISO(selectedOrder.created_at), 'dd MMMM yyyy - hh:mm a', { locale: ar })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">الكمية</p>
                    <p className="font-bold text-lg">{selectedOrder.quantity}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">السعر</p>
                    <p className="font-bold text-lg">{selectedOrder.price} ج.م</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">المتبقي</p>
                    <p className="font-bold text-lg text-destructive">{selectedOrder.remaining} ج.م</p>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">ملاحظات</p>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <Button 
                className="w-full" 
                onClick={() => {
                  setIsDialogOpen(false);
                  window.location.href = '/orders';
                }}
              >
                فتح صفحة الطلبات
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersCalendar;
