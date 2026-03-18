import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Check, CheckCheck } from 'lucide-react';
import { useNotifications, useInventory, useOrders } from '@/hooks/useSupabaseData';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { items: inventory } = useInventory();
  const { orders } = useOrders();

  // Calculate alerts
  const lowStockItems = inventory.filter(item => item.quantity <= item.alert_threshold);
  const pendingOrders = orders.filter(order => order.status !== 'delivered');

  const alertCount = unreadCount || (lowStockItems.length + pendingOrders.length);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    return `منذ ${diffDays} يوم`;
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث سريع (رقم إذن، اسم عميل...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pr-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          {alertCount > 0 && (
            <span className="absolute -top-1 -left-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute left-0 top-12 w-80 bg-card rounded-xl shadow-lg border border-border z-50 overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground">الإشعارات</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    قراءة الكل
                  </button>
                )}
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                        !notif.read ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${!notif.read ? 'bg-primary' : 'bg-muted'}`} />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                          <p className="text-xs text-muted-foreground/60 mt-2">{formatTimeAgo(notif.created_at)}</p>
                        </div>
                        {!notif.read && (
                          <Check className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
                  </div>
                )}
              </div>

              {/* System alerts */}
              {(lowStockItems.length > 0 || pendingOrders.length > 0) && notifications.length === 0 && (
                <div className="p-4 space-y-2">
                  {lowStockItems.length > 0 && (
                    <div className="p-3 bg-warning/10 rounded-lg">
                      <p className="text-sm font-medium text-warning-foreground">
                        ⚠️ {lowStockItems.length} صنف ناقص في المخزن
                      </p>
                    </div>
                  )}
                  {pendingOrders.length > 0 && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        📋 {pendingOrders.length} طلب قيد التنفيذ
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('ar-EG', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
