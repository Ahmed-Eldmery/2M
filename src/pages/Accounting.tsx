import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, X, Loader2 } from 'lucide-react';
import { useTransactions } from '@/hooks/useSupabaseData';
import { formatCurrency, expenseCategories } from '@/data/mockData';

type PaymentMethod = 'cash' | 'instapay_alaa' | 'instapay_amr' | 'vodafone_alaa' | 'vodafone_amr';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'كاش',
  instapay_alaa: 'انستا باي - علاء',
  instapay_amr: 'انستا باي - عمرو',
  vodafone_alaa: 'فودافون كاش - علاء',
  vodafone_amr: 'فودافون كاش - عمرو',
};

const Accounting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [dateRange, setDateRange] = useState('month');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { transactions, loading, addTransaction } = useTransactions();

  const [formData, setFormData] = useState({
    category: '',
    amount: 0,
    description: '',
    payment_method: 'cash' as PaymentMethod,
    recipient: '',
  });

  useEffect(() => {
    if (searchParams.get('action') === 'expense') {
      setModalType('expense');
      setFormData({ ...formData, category: 'خامات' });
      setShowAddModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const filteredTransactions = transactions.filter(t => {
    const matchesType = activeTab === 'all' || t.type === activeTab;
    const matchesPayment = paymentFilter === 'all' || t.payment_method === paymentFilter;
    return matchesType && matchesPayment;
  });

  // Calculate totals by payment method
  const totalsByPayment = transactions.reduce((acc, t) => {
    if (t.type === 'income') {
      acc[t.payment_method] = (acc[t.payment_method] || 0) + t.amount;
    }
    return acc;
  }, {} as Record<PaymentMethod, number>);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  const handleAddTransaction = async () => {
    if (formData.amount <= 0 || !formData.description) return;

    setIsSubmitting(true);
    try {
      await addTransaction({
        type: modalType,
        category: formData.category,
        amount: formData.amount,
        description: formData.description,
        order_id: null,
        payment_method: formData.payment_method,
        recipient: formData.recipient || null,
      });
      setShowAddModal(false);
      setFormData({ category: '', amount: 0, description: '', payment_method: 'cash', recipient: '' });
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setFormData({ 
      category: type === 'income' ? 'مبيعات' : 'خامات', 
      amount: 0, 
      description: '',
      payment_method: 'cash',
      recipient: '',
    });
    setShowAddModal(true);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الحسابات المالية</h1>
          <p className="text-muted-foreground">إدارة الإيرادات والمصروفات</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openAddModal('income')} className="btn-primary">
            <Plus className="w-5 h-5" />
            إضافة إيراد
          </button>
          <button onClick={() => openAddModal('expense')} className="btn-outline">
            <Plus className="w-5 h-5" />
            إضافة مصروف
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card stat-card-success">
          <div className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="mt-8">
            <p className="text-white/80 text-sm mb-1">إجمالي الإيرادات</p>
            <p className="text-3xl font-bold">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
        </div>

        <div className="stat-card stat-card-danger">
          <div className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div className="mt-8">
            <p className="text-white/80 text-sm mb-1">إجمالي المصروفات</p>
            <p className="text-3xl font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
        </div>

        <div className={`stat-card ${netProfit >= 0 ? 'stat-card-primary' : 'stat-card-warning'}`}>
          <div className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="mt-8">
            <p className="text-white/80 text-sm mb-1">صافي الربح</p>
            <p className="text-3xl font-bold">{formatCurrency(netProfit)}</p>
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="glass-card p-4">
        <h3 className="font-bold text-foreground mb-4">الإيرادات حسب طريقة الدفع</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map(method => (
            <div 
              key={method} 
              onClick={() => setPaymentFilter(paymentFilter === method ? 'all' : method)}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                paymentFilter === method 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              <p className={`text-sm ${paymentFilter === method ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {paymentMethodLabels[method]}
              </p>
              <p className="text-lg font-bold">
                {formatCurrency(totalsByPayment[method] || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'income' 
                  ? 'bg-success text-success-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              الإيرادات
            </button>
            <button
              onClick={() => setActiveTab('expense')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'expense' 
                  ? 'bg-destructive text-destructive-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              المصروفات
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-field py-2 w-40"
            >
              <option value="today">اليوم</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
              <option value="year">هذا العام</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right p-4">التاريخ</th>
                <th className="text-right p-4">النوع</th>
                <th className="text-right p-4">الطرف الثاني</th>
                <th className="text-right p-4">طريقة الدفع</th>
                <th className="text-right p-4">التصنيف</th>
                <th className="text-right p-4">الوصف</th>
                <th className="text-center p-4">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      transaction.type === 'income' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {transaction.type === 'income' ? (
                        <>
                          <TrendingUp className="w-4 h-4" />
                          إيراد
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-4 h-4" />
                          مصروف
                        </>
                      )}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="font-medium text-foreground">
                      {transaction.recipient || '—'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {paymentMethodLabels[transaction.payment_method]}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-muted rounded-full text-sm">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="p-4 text-foreground">{transaction.description}</td>
                  <td className="p-4 text-center">
                    <span className={`font-bold ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-card rounded-2xl p-0 w-full max-w-2xl animate-scale-in shadow-2xl my-8 overflow-hidden border border-border">
            {/* Modal Header */}
            <div className={`p-6 text-white flex items-center justify-between ${modalType === 'income' ? 'bg-gradient-to-r from-success/90 to-success' : 'bg-gradient-to-r from-destructive/90 to-destructive'}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                  {modalType === 'income' ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {modalType === 'income' ? 'إذن قبض نقدية' : 'إذن صرف نقدية'}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {modalType === 'income' ? 'إيصال استلام إيرادات' : 'تسجيل مصروفات ومدفوعات'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 bg-muted/10">
              
              {/* Recipient / Payer */}
              <div className="bg-background p-5 rounded-xl border border-border/50 shadow-sm relative">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-background px-2 text-sm font-medium text-primary">
                  الطرف الثاني
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {modalType === 'income' ? 'استلمنا من السيد / الشركة' : 'يصرف للسيد / الشركة'}
                  </label>
                  <input
                    type="text"
                    value={formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    className="input-field text-lg font-medium"
                    placeholder="اسم الشخص أو الجهة..."
                    autoFocus
                  />
                </div>
              </div>

              {/* Amount and Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-background p-5 rounded-xl border border-border/50 shadow-sm relative">
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-background px-2 text-sm font-medium text-primary">
                    القيمة النقدية
                  </div>
                  <div className="mt-2 relative">
                    <input
                      type="number"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      className="input-field text-3xl font-bold text-center pl-16 py-4"
                      placeholder="0.00"
                      min={0}
                      step={0.01}
                    />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      ج.م
                    </span>
                  </div>
                </div>

                <div className="bg-background p-5 rounded-xl border border-border/50 shadow-sm relative">
                  <div className="absolute top-0 right-6 -translate-y-1/2 bg-background px-2 text-sm font-medium text-primary">
                    طريقة الدفع
                  </div>
                  <div className="mt-2">
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                      className="input-field py-4 text-center font-medium"
                    >
                      {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map(method => (
                        <option key={method} value={method}>{paymentMethodLabels[method]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Category and Description */}
              <div className="bg-background p-5 rounded-xl border border-border/50 shadow-sm relative">
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-background px-2 text-sm font-medium text-primary">
                  التفاصيل
                </div>
                <div className="mt-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <label className="text-sm font-semibold text-foreground md:col-span-1">
                      تصنيف {modalType === 'income' ? 'الإيراد' : 'المصروف'}
                    </label>
                    <div className="md:col-span-2">
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="input-field"
                      >
                        {modalType === 'income' ? (
                          <>
                            <option value="مبيعات">مبيعات</option>
                            <option value="تحصيل">تحصيل ديون</option>
                            <option value="أخرى">أخرى</option>
                          </>
                        ) : (
                          expenseCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="text-sm font-semibold text-foreground md:col-span-1 pt-2">
                      وذلك قيمة
                    </label>
                    <div className="md:col-span-2">
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input-field min-h-[100px] leading-relaxed resize-none"
                        placeholder="تفاصيل وشرح المعاملة بحسب البيان..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-background border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-outline px-8 py-3 font-medium"
              >
                إلغاء التغييرات
              </button>
              <button
                onClick={handleAddTransaction}
                className={`px-8 py-3 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] shadow-lg flex items-center gap-2 ${
                  modalType === 'income' 
                    ? 'bg-gradient-to-r from-success to-success/90 hover:shadow-success/25' 
                    : 'bg-gradient-to-r from-destructive to-destructive/90 hover:shadow-destructive/25'
                }`}
                disabled={formData.amount <= 0 || !formData.description || !formData.recipient || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    {modalType === 'income' ? 'حفظ إذن القبض' : 'حفظ إذن الصرف'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
