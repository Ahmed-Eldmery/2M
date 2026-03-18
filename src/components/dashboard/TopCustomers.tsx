import { TrendingUp, User, Loader2 } from 'lucide-react';
import { useCustomers } from '@/hooks/useSupabaseData';
import { formatCurrency } from '@/data/mockData';

const TopCustomers = () => {
  const { customers, loading } = useCustomers();
  
  const topCustomers = [...customers]
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

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
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">أكثر العملاء تعاملاً</h3>
      </div>

      <div className="space-y-4">
        {topCustomers.length > 0 ? (
          topCustomers.map((customer, index) => (
            <div 
              key={customer.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-background/60 backdrop-blur-sm"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                index === 0 ? 'bg-primary text-primary-foreground' :
                index === 1 ? 'bg-secondary text-secondary-foreground' :
                index === 2 ? 'bg-accent text-accent-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.total_orders} طلب</p>
              </div>
              <div className="text-left">
                <p className="font-bold text-primary">{formatCurrency(customer.total_spent)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لا يوجد عملاء بعد</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopCustomers;
