import { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Package, 
  FileText, 
  AlertTriangle,
  DollarSign,
  User,
  Clock,
  Trash2,
  Settings,
  X
} from 'lucide-react';
import { useNotifications, useInventory, useOrders } from '@/hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { items: inventory } = useInventory();
  const { orders } = useOrders();

  // Calculate system alerts
  const lowStockItems = inventory.filter(item => item.quantity <= item.alert_threshold);
  const pendingOrders = orders.filter(order => order.status !== 'delivered');
  const waitingOutsideOrders = orders.filter(order => order.status === 'waiting_outside');

  // Total alert count
  const totalAlerts = unreadCount + lowStockItems.length + waitingOutsideOrders.length;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
      case 'new_order':
        return <FileText className="w-4 h-4 text-primary" />;
      case 'inventory':
      case 'low_stock':
        return <Package className="w-4 h-4 text-warning" />;
      case 'waiting_outside':
        return <Clock className="w-4 h-4 text-info" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-success" />;
      case 'customer':
        return <User className="w-4 h-4 text-accent" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return format(date, 'dd/MM/yyyy', { locale: ar });
  };

  // Filtered notifications
  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
      >
        <Bell className={`w-5 h-5 ${totalAlerts > 0 ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        {totalAlerts > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[20px] h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center px-1 animate-bounce">
            {totalAlerts > 99 ? '99+' : totalAlerts}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-12 w-96 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-in slide-in-from-top-2">
          {/* Header */}
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">الإشعارات</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary/15 text-primary text-xs rounded-full">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={markAllAsRead}
                    className="h-7 text-xs"
                  >
                    <CheckCheck className="w-3 h-3 ml-1" />
                    قراءة الكل
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-muted rounded"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  filter === 'unread'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                غير مقروء
              </button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="max-h-96">
            {/* System Alerts */}
            {(lowStockItems.length > 0 || waitingOutsideOrders.length > 0) && filter === 'all' && (
              <div className="p-3 space-y-2 border-b border-border bg-warning/5">
                <p className="text-xs font-medium text-muted-foreground px-1">تنبيهات النظام</p>
                
                {lowStockItems.length > 0 && (
                  <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <p className="text-sm font-medium">
                        {lowStockItems.length} صنف ناقص في المخزن
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 mr-6">
                      {lowStockItems.slice(0, 3).map(i => i.name).join('، ')}
                      {lowStockItems.length > 3 && ` و${lowStockItems.length - 3} آخرين`}
                    </p>
                  </div>
                )}

                {waitingOutsideOrders.length > 0 && (
                  <div className="p-3 bg-info/10 rounded-lg border border-info/20">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-info" />
                      <p className="text-sm font-medium">
                        {waitingOutsideOrders.length} طلب ينتظر التسليم
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notifications List */}
            {filteredNotifications.length > 0 ? (
              <div className="divide-y divide-border/50">
                {filteredNotifications.slice(0, 15).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-4 cursor-pointer hover:bg-muted/30 transition-colors ${
                      !notif.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${!notif.read ? 'bg-primary/10' : 'bg-muted'}`}>
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notif.read ? 'font-semibold' : 'font-medium'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatTimeAgo(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">
                  {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات'}
                </p>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 15 && (
            <div className="p-3 border-t border-border bg-muted/30">
              <Button variant="ghost" className="w-full text-sm">
                عرض جميع الإشعارات ({notifications.length})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
