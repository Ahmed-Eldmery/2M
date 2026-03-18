import { useState, useEffect } from 'react';
import { Plus, Search, Truck, Phone, DollarSign, Package, Edit, X, Loader2, FileText, Eye } from 'lucide-react';
import { useSuppliers, useInventoryReceipts, DbSupplier } from '@/hooks/useSupabaseData';
import { formatCurrency } from '@/data/mockData';
import ExcelImportExport from '@/components/ExcelImportExport';
import { useNavigate } from 'react-router-dom';

const Suppliers = () => {
  const navigate = useNavigate();
  const { suppliers, loading, addSupplier, updateSupplier, fetchSuppliers } = useSuppliers();
  const { receipts } = useInventoryReceipts();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<DbSupplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<DbSupplier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    total_owed: 0,
  });

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.includes(searchQuery) || 
    (supplier.phone && supplier.phone.includes(searchQuery))
  );

  const totalOwed = suppliers.reduce((sum, s) => sum + s.total_owed, 0);

  // Get receipts for a specific supplier
  const getSupplierReceipts = (supplierId: string) => {
    return receipts.filter(r => r.supplier_id === supplierId);
  };

  // Calculate total purchases for supplier
  const getSupplierTotalPurchases = (supplierId: string) => {
    return getSupplierReceipts(supplierId).reduce((sum, r) => sum + r.total_amount, 0);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', notes: '', total_owed: 0 });
  };

  const handleAddSupplier = async () => {
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      await addSupplier({
        name: formData.name,
        phone: formData.phone || null,
        notes: formData.notes || null,
        total_owed: formData.total_owed,
      });
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier || !formData.name) return;
    
    setIsSubmitting(true);
    try {
      await updateSupplier(editingSupplier.id, {
        name: formData.name,
        phone: formData.phone || null,
        notes: formData.notes || null,
        total_owed: formData.total_owed,
      });
      setEditingSupplier(null);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (supplier: DbSupplier) => {
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      notes: supplier.notes || '',
      total_owed: supplier.total_owed,
    });
    setEditingSupplier(supplier);
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
          <h1 className="text-2xl font-bold text-foreground">الموردين</h1>
          <p className="text-muted-foreground">إدارة الموردين والمستحقات وفواتير الوارد</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/inventory-receipts')}
            className="btn-outline"
          >
            <FileText className="w-5 h-5" />
            أذون الوارد
          </button>
          <ExcelImportExport tableName="suppliers" onImportComplete={fetchSuppliers} />
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            إضافة مورد
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">عدد الموردين</p>
              <p className="text-2xl font-bold text-foreground">{suppliers.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي المستحقات</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOwed)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">موردين بدون مستحقات</p>
              <p className="text-2xl font-bold text-success">
                {suppliers.filter(s => s.total_owed === 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
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

      {/* Suppliers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => {
          const supplierReceipts = getSupplierReceipts(supplier.id);
          const totalPurchases = getSupplierTotalPurchases(supplier.id);
          
          return (
            <div key={supplier.id} className="glass-card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{supplier.name}</h3>
                    {supplier.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {supplier.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setViewingSupplier(supplier)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => openEditModal(supplier)}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {supplier.notes && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{supplier.notes}</p>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المشتريات</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(totalPurchases)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عدد الفواتير</p>
                  <p className="text-xl font-bold text-foreground">{supplierReceipts.length}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">المستحقات</span>
                  <span className={`text-xl font-bold ${supplier.total_owed > 0 ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(supplier.total_owed)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Truck className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">لا يوجد موردين</p>
        </div>
      )}

      {/* View Supplier Receipts Modal */}
      {viewingSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-2xl animate-scale-in max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">فواتير المورد - {viewingSupplier.name}</h2>
                <p className="text-sm text-muted-foreground">
                  إجمالي المشتريات: {formatCurrency(getSupplierTotalPurchases(viewingSupplier.id))}
                </p>
              </div>
              <button 
                onClick={() => setViewingSupplier(null)}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {getSupplierReceipts(viewingSupplier.id).length > 0 ? (
                <div className="space-y-3">
                  {getSupplierReceipts(viewingSupplier.id).map((receipt) => (
                    <div key={receipt.id} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-primary font-bold">{receipt.receipt_number}</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency(receipt.total_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{new Date(receipt.created_at).toLocaleDateString('ar-EG')}</span>
                        <span>{receipt.items?.length || 0} صنف</span>
                      </div>
                      {receipt.notes && (
                        <p className="text-sm text-muted-foreground mt-2 bg-background p-2 rounded">
                          {receipt.notes}
                        </p>
                      )}
                      
                      {/* Receipt Items */}
                      {receipt.items && receipt.items.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {receipt.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-background/50 p-2 rounded">
                              <span className="text-foreground">
                                {item.item_code && <span className="text-primary font-mono">[{item.item_code}] </span>}
                                {item.item_name}
                              </span>
                              <span className="text-muted-foreground">
                                {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">لا توجد فواتير لهذا المورد</p>
                  <button
                    onClick={() => {
                      setViewingSupplier(null);
                      navigate('/inventory-receipts?action=new');
                    }}
                    className="btn-primary mt-4"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة إذن وارد
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setViewingSupplier(null);
                  navigate('/inventory-receipts?action=new');
                }}
                className="btn-primary flex-1"
              >
                <Plus className="w-4 h-4" />
                إذن وارد جديد
              </button>
              <button
                onClick={() => setViewingSupplier(null)}
                className="btn-outline flex-1"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingSupplier) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSupplier(null);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم المورد *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="اسم المورد"
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
                <label className="block text-sm font-medium text-foreground mb-2">المستحقات (ج.م)</label>
                <input
                  type="number"
                  value={formData.total_owed}
                  onChange={(e) => setFormData({ ...formData, total_owed: Number(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder="ملاحظات أو الأصناف الموردة..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={editingSupplier ? handleUpdateSupplier : handleAddSupplier}
                  className="btn-primary flex-1"
                  disabled={!formData.name || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : editingSupplier ? (
                    'حفظ التغييرات'
                  ) : (
                    'إضافة المورد'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSupplier(null);
                    resetForm();
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

export default Suppliers;