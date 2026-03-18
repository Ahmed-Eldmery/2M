import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, ArrowRight, Search, FileInput, Trash2, X, Loader2, Package } from 'lucide-react';
import { useInventoryReceipts, useInventory, useSuppliers, DbInventoryReceiptItem } from '@/hooks/useSupabaseData';
import { formatCurrency } from '@/data/mockData';

const InventoryReceipts = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const { receipts, loading, addReceipt, fetchReceipts } = useInventoryReceipts();
  const { items: inventoryItems } = useInventory();
  const { suppliers } = useSuppliers();

  const [formData, setFormData] = useState({
    supplier_id: '',
    supplier_name: '',
    notes: '',
  });

  const [receiptItems, setReceiptItems] = useState<Omit<DbInventoryReceiptItem, 'id' | 'receipt_id'>[]>([]);

  const filteredReceipts = receipts.filter(receipt => {
    return receipt.receipt_number.includes(searchQuery) || 
      (receipt.supplier_name && receipt.supplier_name.includes(searchQuery));
  });

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowAddModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const addReceiptItem = () => {
    setReceiptItems([
      ...receiptItems,
      {
        inventory_id: null,
        item_name: '',
        item_code: '',
        quantity: 0,
        unit_price: 0,
        total_price: 0,
      }
    ]);
  };

  const updateReceiptItem = (index: number, updates: Partial<Omit<DbInventoryReceiptItem, 'id' | 'receipt_id'>>) => {
    const updated = [...receiptItems];
    updated[index] = { ...updated[index], ...updates };
    
    // Auto-calculate total_price
    if ('quantity' in updates || 'unit_price' in updates) {
      updated[index].total_price = updated[index].quantity * updated[index].unit_price;
    }
    
    // Auto-fill from inventory item
    if ('inventory_id' in updates && updates.inventory_id) {
      const invItem = inventoryItems.find(i => i.id === updates.inventory_id);
      if (invItem) {
        updated[index].item_name = invItem.name;
        updated[index].item_code = invItem.code || '';
        updated[index].unit_price = invItem.purchase_price;
        updated[index].total_price = updated[index].quantity * invItem.purchase_price;
      }
    }
    
    setReceiptItems(updated);
  };

  const removeReceiptItem = (index: number) => {
    setReceiptItems(receiptItems.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return receiptItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      supplier_name: '',
      notes: '',
    });
    setReceiptItems([]);
  };

  const handleAddReceipt = async () => {
    if (receiptItems.length === 0) return;

    setIsSubmitting(true);
    try {
      await addReceipt(
        {
          supplier_id: formData.supplier_id || null,
          supplier_name: formData.supplier_name || null,
          notes: formData.notes || null,
          total_amount: getTotalAmount(),
        },
        receiptItems
      );
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupplierChange = (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData({
      ...formData,
      supplier_id: supplierId,
      supplier_name: supplier?.name || '',
    });
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
        <div className="flex items-center gap-4">
          <Link 
            to="/inventory" 
            className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">إذن الوارد</h1>
            <p className="text-muted-foreground">إدارة إيصالات استلام المخزون</p>
          </div>
        </div>
        <button 
          onClick={() => {
            addReceiptItem();
            setShowAddModal(true);
          }}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          إذن وارد جديد
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث برقم الإذن أو اسم المورد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pr-10"
          />
        </div>
      </div>

      {/* Receipts List */}
      <div className="space-y-4">
        {filteredReceipts.map((receipt) => (
          <div key={receipt.id} className="glass-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center">
                  <FileInput className="w-7 h-7 text-success" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">{receipt.receipt_number}</h3>
                  <p className="text-sm text-muted-foreground">
                    {receipt.supplier_name || 'بدون مورد'} • {new Date(receipt.created_at).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">عدد الأصناف</p>
                  <p className="text-xl font-bold text-foreground">{receipt.items?.length || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">الإجمالي</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(receipt.total_amount)}</p>
                </div>
              </div>
            </div>

            {receipt.items && receipt.items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-wrap gap-2">
                  {receipt.items.map((item, index) => (
                    <span key={index} className="px-3 py-1 bg-muted rounded-full text-sm">
                      {item.item_name} ({item.quantity})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredReceipts.length === 0 && (
        <div className="glass-card p-12 text-center">
          <FileInput className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">لا توجد إيصالات وارد</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-xl p-6 w-full max-w-3xl animate-scale-in my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">إذن وارد جديد</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Supplier Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">المورد</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="">اختر المورد (اختياري)</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">ملاحظات</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-field"
                    placeholder="أي ملاحظات..."
                  />
                </div>
              </div>

              {/* Receipt Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-foreground">الأصناف</label>
                  <button
                    onClick={addReceiptItem}
                    className="btn-outline text-sm py-1"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة صنف
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {receiptItems.map((item, index) => (
                    <div key={index} className="p-4 bg-muted/50 rounded-lg">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-4">
                          <label className="block text-xs text-muted-foreground mb-1">الصنف</label>
                          <select
                            value={item.inventory_id || ''}
                            onChange={(e) => updateReceiptItem(index, { inventory_id: e.target.value || null })}
                            className="input-field text-sm"
                          >
                            <option value="">صنف جديد</option>
                            {inventoryItems.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.code ? `${inv.code} - ` : ''}{inv.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-muted-foreground mb-1">الاسم</label>
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => updateReceiptItem(index, { item_name: e.target.value })}
                            className="input-field text-sm"
                            placeholder="اسم الصنف"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-muted-foreground mb-1">الكمية</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateReceiptItem(index, { quantity: Number(e.target.value) })}
                            className="input-field text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-muted-foreground mb-1">سعر الوحدة</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateReceiptItem(index, { unit_price: Number(e.target.value) })}
                            className="input-field text-sm"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <label className="block text-xs text-muted-foreground mb-1">الإجمالي</label>
                          <span className="text-sm font-bold text-primary">{formatCurrency(item.total_price)}</span>
                        </div>
                        <div className="col-span-1">
                          <button
                            onClick={() => removeReceiptItem(index)}
                            className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {receiptItems.length === 0 && (
                  <div className="p-8 bg-muted/30 rounded-lg text-center">
                    <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">لا توجد أصناف. أضف صنف للبدء.</p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="p-4 bg-success/10 rounded-lg flex items-center justify-between">
                <span className="font-medium text-foreground">إجمالي الإذن</span>
                <span className="text-2xl font-bold text-success">{formatCurrency(getTotalAmount())}</span>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddReceipt}
                  className="btn-primary flex-1"
                  disabled={receiptItems.length === 0 || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ إذن الوارد'}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
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

export default InventoryReceipts;
