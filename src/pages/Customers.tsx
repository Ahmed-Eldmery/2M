import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, User, Phone, FileText, Edit, Eye, X, Loader2, Crown, CreditCard, Users, Building, Trash2 } from 'lucide-react';
import { useCustomers, useOrders, DbCustomer } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/data/mockData';
import ExcelImportExport from '@/components/ExcelImportExport';

type CustomerType = 'regular' | 'open_account' | 'vip' | 'office';
type TabFilter = 'all' | 'pending' | 'open_account' | 'vip' | 'office';

const customerTypeLabels: Record<CustomerType, string> = {
  regular: 'عادي',
  open_account: 'حساب مفتوح',
  vip: 'VIP',
  office: 'مكتب'
};

const customerTypeIcons: Record<CustomerType, React.ReactNode> = {
  regular: <User className="w-4 h-4" />,
  open_account: <CreditCard className="w-4 h-4" />,
  vip: <Crown className="w-4 h-4" />,
  office: <Building className="w-4 h-4" />
};

const Customers = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<DbCustomer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { customers, loading, addCustomer, updateCustomer, fetchCustomers, deleteMultipleCustomers } = useCustomers();
  const { orders } = useOrders();
  const { isOwnerOrAccountant } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    customer_type: 'regular' as CustomerType,
  });

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowAddModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const getCustomerPending = (customerId: string) => {
    return orders
      .filter(o => o.customer_id === customerId && o.remaining > 0)
      .reduce((sum, o) => sum + o.remaining, 0);
  };

  const getCustomerOrders = (customerId: string) => {
    return orders.filter(o => o.customer_id === customerId);
  };

  // Filter customers based on active tab and search
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.includes(searchQuery) || (customer.phone && customer.phone.includes(searchQuery));
    
    if (!matchesSearch) return false;

    switch (activeTab) {
      case 'pending':
        return getCustomerPending(customer.id) > 0;
      case 'open_account':
        return customer.customer_type === 'open_account';
      case 'vip':
        return customer.customer_type === 'vip';
      case 'office':
        return customer.customer_type === 'office';
      default:
        return true;
    }
  });

  // Calculate tab counts
  const tabCounts = {
    all: customers.length,
    pending: customers.filter(c => getCustomerPending(c.id) > 0).length,
    open_account: customers.filter(c => c.customer_type === 'open_account').length,
    vip: customers.filter(c => c.customer_type === 'vip').length,
    office: customers.filter(c => c.customer_type === 'office').length,
  };

  const handleAddCustomer = async () => {
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      await addCustomer({
        name: formData.name,
        phone: formData.phone || null,
        notes: formData.notes || null,
        customer_type: formData.customer_type,
      });
      setShowAddModal(false);
      setFormData({ name: '', phone: '', notes: '', customer_type: 'regular' });
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedIds.size} عملاء؟`)) {
      try {
        setIsSubmitting(true);
        await deleteMultipleCustomers(Array.from(selectedIds));
        setSelectedIds(new Set());
      } catch (error) {
        // Error handled in hook
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !formData.name) return;
    
    setIsSubmitting(true);
    try {
      await updateCustomer(editingCustomer.id, {
        name: formData.name,
        phone: formData.phone || null,
        notes: formData.notes || null,
        customer_type: formData.customer_type,
      });
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', notes: '', customer_type: 'regular' });
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (customer: DbCustomer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      notes: customer.notes || '',
      customer_type: customer.customer_type || 'regular',
    });
    setEditingCustomer(customer);
  };

  const getCustomerTypeStyle = (type: CustomerType) => {
    switch (type) {
      case 'vip':
        return 'bg-warning/15 text-warning border-warning/30';
      case 'open_account':
        return 'bg-info/15 text-info border-info/30';
      case 'office':
        return 'bg-accent/15 text-accent border-accent/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
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
          <h1 className="text-2xl font-bold text-foreground">إدارة العملاء</h1>
          <p className="text-muted-foreground">قاعدة بيانات العملاء وسجل التعاملات</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleBulkDelete} 
              className="btn-outline border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              disabled={isSubmitting}
            >
              <Trash2 className="w-5 h-5" />
              حذف المختار ({selectedIds.size})
            </button>
          )}
          <ExcelImportExport tableName="customers" onImportComplete={fetchCustomers} />
          <button onClick={() => {
            setFormData({ name: '', phone: '', notes: '', customer_type: 'office' });
            setShowAddModal(true);
          }} className="btn-outline border-accent text-accent hover:bg-accent hover:text-accent-foreground">
            <Building className="w-5 h-5" />
            إضافة مكتب
          </button>
          <button onClick={() => {
            setFormData({ name: '', phone: '', notes: '', customer_type: 'regular' });
            setShowAddModal(true);
          }} className="btn-primary">
            <Plus className="w-5 h-5" />
            عميل جديد
          </button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="glass-card p-4 space-y-4">
        {/* Select All */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={selectedIds.size > 0 && selectedIds.size === filteredCustomers.length}
            onChange={toggleSelectAll}
            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-muted-foreground">
            {selectedIds.size === filteredCustomers.length ? 'إلغاء تحديد الكل' : 'تحديد الكل من هذه القائمة'}
          </span>
        </div>
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'all' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Users className="w-4 h-4" />
            الكل ({tabCounts.all})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'pending' 
                ? 'bg-destructive text-destructive-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            لم يخلصوا الحساب ({tabCounts.pending})
          </button>
          <button
            onClick={() => setActiveTab('open_account')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'open_account' 
                ? 'bg-info text-info-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            حساب مفتوح ({tabCounts.open_account})
          </button>
          <button
            onClick={() => setActiveTab('vip')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'vip' 
                ? 'bg-warning text-warning-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Crown className="w-4 h-4" />
            VIP ({tabCounts.vip})
          </button>
          <button
            onClick={() => setActiveTab('office')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'office' 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Building className="w-4 h-4" />
            مكاتب ({tabCounts.office})
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pr-10"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const pendingAmount = getCustomerPending(customer.id);
          const customerOrders = getCustomerOrders(customer.id);

          return (
            <div key={customer.id} className={`glass-card p-6 hover:shadow-lg transition-all relative ${selectedIds.has(customer.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
              <div className="absolute top-4 left-4 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(customer.id)}
                  onChange={() => toggleSelection(customer.id)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    customer.customer_type === 'vip' 
                      ? 'bg-warning/20' 
                      : customer.customer_type === 'open_account' 
                        ? 'bg-info/20' 
                        : customer.customer_type === 'office'
                          ? 'bg-accent/20'
                          : 'bg-primary/10'
                  }`}>
                    {customer.customer_type === 'vip' ? (
                      <Crown className="w-6 h-6 text-warning" />
                    ) : customer.customer_type === 'open_account' ? (
                      <CreditCard className="w-6 h-6 text-info" />
                    ) : customer.customer_type === 'office' ? (
                      <Building className="w-6 h-6 text-accent" />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground">{customer.name}</h3>
                      {customer.customer_type !== 'regular' && (
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getCustomerTypeStyle(customer.customer_type || 'regular')}`}>
                          {customerTypeLabels[customer.customer_type || 'regular']}
                        </span>
                      )}
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        {customer.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => navigate(`/customers/${customer.id}/orders`)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => openEditModal(customer)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {customer.notes && (
                <p className="text-sm text-muted-foreground mb-4 bg-muted/50 p-2 rounded">
                  {customer.notes}
                </p>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">عدد الطلبات</p>
                  <p className="text-xl font-bold text-foreground">{customerOrders.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي التعامل</p>
                  {isOwnerOrAccountant() ? (
                    <p className="text-xl font-bold text-primary">{formatCurrency(customer.total_spent)}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">---</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
                  {isOwnerOrAccountant() ? (
                    <p className="text-xl font-bold text-success">{formatCurrency(customerOrders.reduce((sum, o) => sum + o.paid, 0))}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">---</p>
                  )}
                </div>
              </div>

              {pendingAmount > 0 && isOwnerOrAccountant() && (
                <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-warning-foreground">رصيد متبقي</span>
                    <span className="font-bold text-warning">{formatCurrency(pendingAmount)}</span>
                  </div>
                </div>
              )}

              <button 
                onClick={() => navigate(`/customers/${customer.id}/orders`)}
                className="w-full mt-4 py-2 text-center text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                عرض سجل الطلبات
              </button>
            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="glass-card p-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">لا يوجد عملاء مطابقين للبحث</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingCustomer) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCustomer(null);
                  setFormData({ name: '', phone: '', notes: '', customer_type: 'regular' });
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم العميل *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="الاسم الكامل"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="01xxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">نوع العميل</label>
                <div className="flex gap-2 flex-wrap">
                  {(['regular', 'open_account', 'vip', 'office'] as CustomerType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, customer_type: type })}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        formData.customer_type === type
                          ? type === 'vip' 
                            ? 'bg-warning text-warning-foreground border-warning'
                            : type === 'open_account'
                              ? 'bg-info text-info-foreground border-info'
                              : type === 'office'
                            ? 'bg-accent text-accent-foreground border-accent'
                            : 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      }`}
                    >
                      {customerTypeIcons[type]}
                      {customerTypeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ملاحظات (اختياري)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder="أي ملاحظات عن العميل..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
                  className="btn-primary flex-1"
                  disabled={!formData.name || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : editingCustomer ? (
                    'حفظ التغييرات'
                  ) : (
                    'إضافة العميل'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCustomer(null);
                    setFormData({ name: '', phone: '', notes: '', customer_type: 'regular' });
                  }}
                  className="btn-outline flex-1"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
