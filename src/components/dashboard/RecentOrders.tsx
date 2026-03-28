import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2 } from 'lucide-react';
import { useOrders } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/mockData';

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    new: 'جديد',
    design: 'قيد التصميم',
    printing: 'قيد الطباعة',
    printed: 'تم الطباعة',
    waiting_outside: 'العميل بالخارج',
    delivered: 'تم التسليم',
  };
  return labels[status] || status;
};

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    new: 'bg-info/15 text-info',
    design: 'bg-secondary/15 text-secondary',
    printing: 'bg-primary/15 text-primary',
    printed: 'bg-accent/15 text-accent',
    waiting_outside: 'bg-warning/15 text-warning',
    delivered: 'bg-success/15 text-success',
  };
  return classes[status] || 'bg-muted text-muted-foreground';
};

const RecentOrders = () => {
  const { orders, loading } = useOrders();
  const { isOwnerOrAccountant } = useAuth();
  const recentOrders = orders.slice(0, 5);
  const canViewFinancials = isOwnerOrAccountant();

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">آخر الطلبات</h3>
        <Link 
          to="/orders" 
          className="text-primary text-sm flex items-center gap-1 hover:underline"
        >
          عرض الكل
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {recentOrders.length > 0 ? (
          recentOrders.map((order) => (
            <div 
              key={order.id}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">
                    {order.order_number.split('-').pop()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{order.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{order.work_type}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {canViewFinancials && (
                  <div className="text-left">
                    <p className="font-bold text-foreground">{formatCurrency(order.price)}</p>
                    {order.remaining > 0 && (
                      <p className="text-sm text-destructive">متبقي: {formatCurrency(order.remaining)}</p>
                    )}
                  </div>
                )}
                <span className={`status-badge ${getStatusClass(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
                <button className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لا توجد طلبات بعد</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentOrders;
