import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Phone, User, FileText, Eye, Calendar, X, Loader2, CreditCard, CheckCircle2, Circle } from 'lucide-react';
import { useOrders, useCustomers, useTransactions, DbPrintOrder, DbTransaction } from '@/hooks/useSupabaseData';
import { useOrderItems, DbOrderItem } from '@/hooks/useOrderItems';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/mockData';

type OrderStatus = DbPrintOrder['status'];

const statusOptions: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'new', label: 'جديد' },
  { value: 'design', label: 'قيد التصميم' },
  { value: 'printing', label: 'قيد الطباعة' },
  { value: 'printed', label: 'تم الطباعة' },
  { value: 'waiting_outside', label: 'العميل بالخارج' },
  { value: 'delivered', label: 'تم التسليم' },
];

const getStatusLabel = (status: OrderStatus) => {
  const labels: Record<OrderStatus, string> = {
    new: 'جديد',
    design: 'قيد التصميم',
    printing: 'قيد الطباعة',
    printed: 'تم الطباعة',
    waiting_outside: 'العميل بالخارج',
    delivered: 'تم التسليم',
  };
  return labels[status] || status;
};

const getStatusClass = (status: OrderStatus) => {
  const classes: Record<OrderStatus, string> = {
    new: 'bg-info/15 text-info',
    design: 'bg-secondary/15 text-secondary',
    printing: 'bg-primary/15 text-primary',
    printed: 'bg-accent/15 text-accent',
    waiting_outside: 'bg-warning/15 text-warning',
    delivered: 'bg-success/15 text-success',
  };
  return classes[status] || 'bg-muted text-muted-foreground';
};

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    cash: 'نقدي',
    instapay_alaa: 'انستاباي علاء',
    instapay_amr: 'انستاباي عمرو',
    vodafone_alaa: 'فودافون علاء',
    vodafone_amr: 'فودافون عمرو',
  };
  return labels[method] || method;
};

const CustomerOrders = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { isOwnerOrAccountant } = useAuth();
  
  const { orders, loading: ordersLoading } = useOrders();
  const { customers, loading: customersLoading } = useCustomers();
  const { transactions, loading: transactionsLoading } = useTransactions();
  const { items: allOrderItems } = useOrderItems();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showViewModal, setShowViewModal] = useState<DbPrintOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');
  
  const customer = customers.find(c => c.id === customerId);
  const customerOrders = orders.filter(order => order.customer_id === customerId);
  
  // Get transactions linked to customer orders
  const customerTransactions = transactions.filter(t => 
    t.order_id && customerOrders.some(o => o.id === t.order_id)
  );

  const filteredOrders = customerOrders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.work_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.dimensions && order.dimensions.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    let matchesDate = true;
    if (dateFrom) matchesDate = matchesDate && new Date(order.created_at) >= new Date(dateFrom);
    if (dateTo) matchesDate = matchesDate && new Date(order.created_at) <= new Date(dateTo + 'T23:59:59');
    return matchesSearch && matchesStatus && matchesDate;
  });
  
  const totalOrders = customerOrders.length;
  const totalSpent = customerOrders.reduce((sum, o) => sum + o.price, 0);
  const totalPaid = customerOrders.reduce((sum, o) => sum + o.paid, 0);
  const totalRemaining = customerOrders.reduce((sum, o) => sum + o.remaining, 0);
  const completedOrders = customerOrders.filter(o => o.status === 'delivered').length;
  const pendingOrders = customerOrders.filter(o => o.status !== 'delivered').length;

  const loading = ordersLoading || customersLoading || transactionsLoading;

  // Get order items for modal
  const getOrderItems = (orderId: string): DbOrderItem[] => {
    return allOrderItems.filter(item => item.order_id === orderId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">العميل غير موجود</p>
        <button onClick={() => navigate('/customers')} className="btn-primary">العودة للعملاء</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/customers')}
          className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">سجل طلبات العميل</h1>
          <p className="text-muted-foreground">تاريخ التعاملات والطلبات</p>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
              {customer.phone && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </div>
              )}
              {customer.notes && <p className="text-sm text-muted-foreground mt-1">{customer.notes}</p>}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
            </div>
            {isOwnerOrAccountant() && (
              <>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">إجمالي المبلغ</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="text-sm text-success">المدفوع</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="text-center p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm text-destructive">المتبقي</p>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(totalRemaining)}</p>
                </div>
              </>
            )}
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary">مكتمل / قيد التنفيذ</p>
              <p className="text-xl font-bold text-primary">{completedOrders} / {pendingOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'orders' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <FileText className="w-4 h-4 inline-block ml-2" />
          الطلبات ({customerOrders.length})
        </button>
        {isOwnerOrAccountant() && (
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'payments' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <CreditCard className="w-4 h-4 inline-block ml-2" />
            المدفوعات ({customerTransactions.length})
          </button>
        )}
      </div>

      {activeTab === 'orders' && (
        <>
          {/* Filters */}
          <div className="glass-card p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="بحث برقم الإذن أو نوع العمل أو المقاسات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pr-10"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field w-auto" />
                <span className="text-muted-foreground">إلى</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field w-auto" />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mt-4">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {option.label}
                  <span className="mr-1 text-xs opacity-70">
                    ({option.value === 'all' ? customerOrders.length : customerOrders.filter(o => o.status === option.value).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-4 font-medium text-muted-foreground">رقم الإذن</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">التاريخ</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">نوع العمل</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">المقاسات</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">الكمية</th>
                    {isOwnerOrAccountant() && (
                      <>
                        <th className="text-right p-4 font-medium text-muted-foreground">الإجمالي</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">المدفوع</th>
                        <th className="text-right p-4 font-medium text-muted-foreground">المتبقي</th>
                      </>
                    )}
                    <th className="text-right p-4 font-medium text-muted-foreground">الحالة</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">التسليم</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const orderItems = getOrderItems(order.id);
                    const deliveredCount = orderItems.filter(i => i.is_delivered).length;
                    const totalItems = orderItems.length;
                    
                    return (
                      <tr key={order.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <span className="font-medium text-primary">{order.order_number}</span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="p-4 text-foreground">{order.work_type}</td>
                        <td className="p-4 text-foreground">{order.dimensions}</td>
                        <td className="p-4 text-foreground">{order.quantity}</td>
                        {isOwnerOrAccountant() && (
                          <>
                            <td className="p-4 font-medium text-foreground">{formatCurrency(order.price)}</td>
                            <td className="p-4 font-medium text-success">{formatCurrency(order.paid)}</td>
                            <td className={`p-4 font-medium ${order.remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                              {formatCurrency(order.remaining)}
                            </td>
                          </>
                        )}
                        <td className="p-4">
                          <span className={`status-badge ${getStatusClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="p-4">
                          {totalItems > 0 ? (
                            <span className={`text-sm font-medium ${deliveredCount === totalItems ? 'text-success' : 'text-warning'}`}>
                              {deliveredCount}/{totalItems}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => setShowViewModal(order)}
                            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredOrders.length === 0 && (
            <div className="glass-card p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">لا توجد طلبات مطابقة للبحث</p>
            </div>
          )}
        </>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && isOwnerOrAccountant() && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold text-foreground">سجل المدفوعات</h3>
            <p className="text-sm text-muted-foreground">جميع المدفوعات المرتبطة بطلبات هذا العميل</p>
          </div>
          {customerTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-4 font-medium text-muted-foreground">التاريخ</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">رقم الطلب</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">النوع</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">المبلغ</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">طريقة الدفع</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {customerTransactions.map((t) => {
                    const relatedOrder = customerOrders.find(o => o.id === t.order_id);
                    return (
                      <tr key={t.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-4 text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-primary">{relatedOrder?.order_number || '—'}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            t.type === 'income' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                          }`}>
                            {t.type === 'income' ? 'إيراد' : 'مصروف'}
                          </span>
                        </td>
                        <td className={`p-4 font-bold ${t.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(t.amount)}
                        </td>
                        <td className="p-4 text-foreground">{getPaymentMethodLabel(t.payment_method)}</td>
                        <td className="p-4 text-muted-foreground">{t.description || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">لا توجد مدفوعات مسجلة لهذا العميل</p>
            </div>
          )}
        </div>
      )}

      {/* View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">تفاصيل الإذن</h2>
              <button onClick={() => setShowViewModal(null)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رقم الإذن</p>
                  <p className="font-bold text-primary">{showViewModal.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium text-foreground">{new Date(showViewModal.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <span className={`status-badge ${getStatusClass(showViewModal.status)}`}>
                  {getStatusLabel(showViewModal.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">نوع العمل</p>
                  <p className="font-medium text-foreground">{showViewModal.work_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المقاسات</p>
                  <p className="font-medium text-foreground">{showViewModal.dimensions}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">الكمية</p>
                <p className="font-medium text-foreground">{showViewModal.quantity} قطعة</p>
              </div>

              {/* Order Items Delivery Status */}
              {(() => {
                const items = getOrderItems(showViewModal.id);
                if (items.length === 0) return null;
                return (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">عناصر الطلب</p>
                    <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          {item.is_delivered ? (
                            <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={`text-sm ${item.is_delivered ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {item.item_name} × {item.quantity}
                          </span>
                          {item.is_delivered && item.delivered_at && (
                            <span className="text-xs text-muted-foreground mr-auto">
                              {new Date(item.delivered_at).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {isOwnerOrAccountant() && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">الإجمالي</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(showViewModal.price)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">المدفوع</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(showViewModal.paid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">المتبقي</p>
                    <p className={`text-xl font-bold ${showViewModal.remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                      {formatCurrency(showViewModal.remaining)}
                    </p>
                  </div>
                </div>
              )}

              {showViewModal.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">ملاحظات</p>
                  <p className="font-medium text-foreground bg-muted/50 p-2 rounded">{showViewModal.notes}</p>
                </div>
              )}

              <button onClick={() => setShowViewModal(null)} className="btn-outline w-full">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;
