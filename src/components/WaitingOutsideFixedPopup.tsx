import { useState, useEffect } from 'react';
import { AlertCircle, Printer, X, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { useOrders, DbPrintOrder } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/mockData';

const WaitingOutsideFixedPopup = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastCount, setLastCount] = useState(0);
  const { orders, updateOrderStatus } = useOrders();
  const { hasRole, isOwner } = useAuth();

  const waitingOrders = orders.filter(o => o.status === 'waiting_outside');
  
  // Only show for printer role or owner
  const canView = hasRole('printer') || isOwner();

  // Auto-show when NEW waiting orders arrive (count increases)
  useEffect(() => {
    if (waitingOrders.length > lastCount && waitingOrders.length > 0 && canView) {
      setIsDismissed(false);
      setIsExpanded(true);
    }
    setLastCount(waitingOrders.length);
  }, [waitingOrders.length, canView]);

  if (!canView || waitingOrders.length === 0 || isDismissed) {
    return null;
  }

  const handleDeliver = async (order: DbPrintOrder) => {
    await updateOrderStatus(order.id, 'delivered');
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 w-80 bg-card border-2 border-warning rounded-xl shadow-2xl animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-warning/10 rounded-t-xl cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center animate-pulse">
            <AlertCircle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">عملاء بالخارج!</h3>
            <p className="text-sm text-muted-foreground">{waitingOrders.length} طلب ينتظر</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 max-h-80 overflow-y-auto space-y-3">
          {waitingOrders.map((order) => (
            <div key={order.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-foreground">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.order_number} • {order.work_type}
                  </p>
                </div>
                <span className={`text-sm font-bold ${order.remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                  {order.remaining > 0 ? `متبقي: ${formatCurrency(order.remaining)}` : 'مسدد'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeliver(order)}
                  className="btn-primary flex-1 py-2 text-sm"
                >
                  تم التسليم
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WaitingOutsideFixedPopup;
