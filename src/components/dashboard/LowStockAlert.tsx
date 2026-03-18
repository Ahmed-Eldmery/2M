import { AlertTriangle, Package, Loader2 } from 'lucide-react';
import { useInventory } from '@/hooks/useSupabaseData';

const LowStockAlert = () => {
  const { items, loading } = useInventory();
  const lowStockItems = items.filter(item => item.quantity <= item.alert_threshold);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (lowStockItems.length === 0) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">تنبيهات المخزن</h3>
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <Package className="w-8 h-8 text-success" />
          </div>
          <p className="text-muted-foreground">جميع الأصناف متوفرة ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-warning" />
        <h3 className="text-lg font-bold text-foreground">تنبيهات المخزن</h3>
      </div>

      <div className="space-y-3">
        {lowStockItems.map((item) => (
          <div 
            key={item.id}
            className="flex items-center justify-between p-3 bg-warning/10 border border-warning/20 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.category}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="font-bold text-warning">{item.quantity}</p>
              <p className="text-xs text-muted-foreground">الحد: {item.alert_threshold}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LowStockAlert;
