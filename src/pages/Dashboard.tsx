import { 
  FileText, Package, Users, DollarSign, TrendingUp, Clock, 
  Crown, CreditCard, Activity, Wallet, PieChart, Banknote 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '@/components/dashboard/StatCard';
import RecentOrders from '@/components/dashboard/RecentOrders';
import LowStockAlert from '@/components/dashboard/LowStockAlert';
import TopCustomers from '@/components/dashboard/TopCustomers';
import { useOrders, useCustomers, useTransactions, useInventory } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/mockData';

const Dashboard = () => {
  const { orders } = useOrders();
  const { customers } = useCustomers();
  const { transactions } = useTransactions();
  const { items: inventory } = useInventory();
  const { isOwnerOrAccountant, hasRole, isOwner } = useAuth();
  
  const canViewFinancials = isOwnerOrAccountant();

  // 1. Automatic Analytics
  const today = new Date();
  const todayOrdersList = orders.filter(order => new Date(order.created_at).toDateString() === today.toDateString());
  const todayOrders = todayOrdersList.length;
  const todaySales = todayOrdersList.reduce((sum, o) => sum + o.price, 0);

  const pendingOrders = orders.filter(order => order.status !== 'delivered').length;
  const waitingOutsideOrders = orders.filter(order => order.status === 'waiting_outside').length;
  
  // Financial Automatic Automation
  // Orders Total Value
  const totalSales = orders.reduce((sum, o) => sum + o.price, 0);
  // Orders Cash Currently Paid
  const totalPaidFromOrders = orders.reduce((sum, o) => sum + o.paid, 0);
  // Total Pending (Debts on customers)
  const totalPending = orders.reduce((sum, o) => sum + o.remaining, 0);

  // External Transactions (Exclude those generated automatically from orders to prevent double counting)
  const externalIncome = transactions.filter(t => t.type === 'income' && !t.order_id).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  // Total Treasury (Cash in Hand) = Orders Cash + External Income
  const totalTreasury = totalPaidFromOrders + externalIncome;
  // Net Profit = Cash in Hand - Expenses
  const netProfit = totalTreasury - totalExpenses;

  const lowStockCount = inventory.filter(item => item.quantity <= item.alert_threshold).length;

  // Customer statistics
  const vipCustomers = customers.filter(c => c.customer_type === 'vip').length;
  const openAccountCustomers = customers.filter(c => c.customer_type === 'open_account').length;
  const customersWithPending = customers.filter(c => 
    orders.filter(o => o.customer_id === c.id && o.remaining > 0).length > 0
  ).length;

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      
      {/* Page Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/20 via-primary/5 to-background border border-primary/20 p-8 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-foreground mb-2 flex items-center gap-3">
              مرحباً بك في 2M للدعاية <span className="animate-wave text-4xl">👋</span>
            </h1>
            <p className="text-muted-foreground text-lg">نظرة عامة حية وتلقائية على أداء المكتب المالي والتشغيلي</p>
          </div>
          <div className="flex gap-4">
            <Link to="/orders?action=new" className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all hover:-translate-y-1 flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              إذن طباعة جديد
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Extreme Financial Automation Row - Only for Owner */}
      {canViewFinancials && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-2xl p-6 relative overflow-hidden transition-transform hover:scale-105">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-success-foreground font-bold mb-1">الخزينة (النقدية الحالية)</p>
                <h3 className="text-3xl font-black text-foreground">{formatCurrency(totalTreasury)}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-success" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-success"/> محصلة من الطلبات وأذونات القبض آلياً
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-6 relative overflow-hidden transition-transform hover:scale-105">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-primary font-bold mb-1">صافي الأرباح الحالية</p>
                <h3 className="text-3xl font-black text-foreground">{formatCurrency(netProfit)}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Banknote className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">بعد خصم المصروفات المسجلة ({formatCurrency(totalExpenses)})</p>
          </div>

          <div className="bg-gradient-to-br from-info/20 to-info/5 border border-info/30 rounded-2xl p-6 relative overflow-hidden transition-transform hover:scale-105">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-info-foreground font-bold mb-1">إجمالي المبيعات (حجم العمل)</p>
                <h3 className="text-3xl font-black text-foreground">{formatCurrency(totalSales)}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-info" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">قيمة كل أوامر الطباعة المنجزة وقيد التنفيذ</p>
          </div>

          <div className="bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30 rounded-2xl p-6 relative overflow-hidden transition-transform hover:scale-105">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-destructive-foreground font-bold mb-1">ديون بالخارج (آجل)</p>
                <h3 className="text-3xl font-black text-foreground">{formatCurrency(totalPending)}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
               <Users className="w-3 h-3 text-destructive"/> ديون لعدد {customersWithPending} عميل يجب تحصيلهم
            </p>
          </div>
        </div>
      )}

      {/* Operational Stats Grid */}
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4 mt-8">
        <PieChart className="w-6 h-6 text-primary" />
        مؤشرات التشغيل الحية
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {canViewFinancials && (
          <StatCard
            title="مبيعات اليوم"
            value={formatCurrency(todaySales)}
            subtitle={`${todayOrders} طلب جديد اليوم`}
            icon={TrendingUp}
            variant="primary"
          />
        )}
        <StatCard
          title="قيد التنفيذ (تصميم/طباعة)"
          value={pendingOrders}
          subtitle="أمر طباعة بالانتظار"
          icon={Clock}
          variant="warning"
        />
        {waitingOutsideOrders > 0 && (hasRole('printer') || isOwner()) && (
           <div className="animate-pulse">
             <StatCard
              title="تنبيه: انتظار بالخارج"
              value={waitingOutsideOrders}
              subtitle="عميل ينتظر التسليم الآن!"
              icon={Clock}
              variant="danger"
             />
           </div>
        )}
        <StatCard
          title="تنبيهات نواقص المخزن"
          value={lowStockCount}
          subtitle="أصناف وصلت للحد الأدنى!"
          icon={Package}
          variant={lowStockCount > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-4">
        {/* Recent Orders - Takes 2 columns */}
        <div className="xl:col-span-2">
          <RecentOrders />
        </div>

        {/* Alerts & Actions */}
        <div className="space-y-6">
          
          <div className="glass-card p-6 border-t-4 border-t-primary">
            <h3 className="text-lg font-bold text-foreground mb-6">إجراءات سريعة</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/orders?action=new" className="btn-primary py-4 flex-col gap-2 rounded-xl text-sm font-bold">
                <FileText className="w-6 h-6" />
                طباعة أوردر
              </Link>
              <Link to="/inventory?action=new" className="btn-outline py-4 flex-col gap-2 rounded-xl text-sm font-bold bg-background">
                <Package className="w-6 h-6" />
                توريد مخزن
              </Link>
              <Link to="/customers?action=new" className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex flex-col items-center justify-center py-4 gap-2 rounded-xl text-sm font-bold transition-all shadow-md mt-2">
                <Users className="w-6 h-6" />
                عميل جديد
              </Link>
              {canViewFinancials && (
                <Link to="/accounting?action=expense" className="bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white flex flex-col items-center justify-center py-4 gap-2 rounded-xl text-sm font-bold transition-all shadow-sm mt-2">
                  <DollarSign className="w-6 h-6" />
                  صرف نقدية
                </Link>
              )}
            </div>
          </div>

          <LowStockAlert />
          
        </div>
      </div>

    </div>
  );
};

// Add standard PlusIcon for the link
const PlusIcon = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export default Dashboard;
