import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Search, Package, Edit, Trash2, AlertTriangle, X, Loader2, FileInput } from 'lucide-react';
import { useInventory, DbInventory } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, categories } from '@/data/mockData';
import ExcelImportExport from '@/components/ExcelImportExport';

const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DbInventory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { items, loading, addItem, updateItem, deleteItem, fetchItems, deleteMultipleItems } = useInventory();
  const { isOwnerOrAccountant } = useAuth();
  const canViewFinancials = isOwnerOrAccountant();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'خامات',
    unit: 'sqm' as 'meter' | 'sqm' | 'piece',
    quantity: 0,
    alert_threshold: 10,
    purchase_price: 0,
    selling_price: 0,
    office_purchase_price: 0,
    office_selling_price: 0,
  });

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowAddModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.includes(searchQuery) || 
      item.category.includes(searchQuery) ||
      (item.code && item.code.includes(searchQuery));
    const matchesCategory = selectedCategory === 'الكل' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'meter': return 'متر';
      case 'sqm': return 'م²';
      case 'piece': return 'قطعة';
      default: return unit;
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      category: 'خامات',
      unit: 'sqm',
      quantity: 0,
      alert_threshold: 10,
      purchase_price: 0,
      selling_price: 0,
      office_purchase_price: 0,
      office_selling_price: 0,
    });
  };

  const handleAddItem = async () => {
    if (!formData.name) return;

    setIsSubmitting(true);
    try {
      await addItem(formData);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    setIsSubmitting(true);
    try {
      await updateItem(editingItem.id, formData);
      setShowEditModal(false);
      setEditingItem(null);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (item: DbInventory) => {
    setFormData({
      code: item.code || '',
      name: item.name,
      category: item.category,
      unit: item.unit as 'meter' | 'sqm' | 'piece',
      quantity: item.quantity,
      alert_threshold: item.alert_threshold,
      purchase_price: item.purchase_price,
      selling_price: item.selling_price || 0,
      office_purchase_price: item.office_purchase_price || 0,
      office_selling_price: item.office_selling_price || 0,
    });
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      await deleteItem(id);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedIds.size} أصناف؟`)) {
      try {
        setIsSubmitting(true);
        await deleteMultipleItems(Array.from(selectedIds));
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
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(item => item.id)));
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
          <h1 className="text-2xl font-bold text-foreground">إدارة المخزن</h1>
          <p className="text-muted-foreground">إدارة الخامات والمواد المتوفرة</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
          <ExcelImportExport tableName="inventory" onImportComplete={fetchItems} />
          <Link 
            to="/inventory/receipts"
            className="btn-outline"
          >
            <FileInput className="w-5 h-5" />
            إذن وارد
          </Link>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            إضافة صنف جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الكود أو التصنيف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pr-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('الكل')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'الكل' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              الكل
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="text-right p-4">الكود</th>
                <th className="text-right p-4">الصنف</th>
                <th className="text-right p-4">التصنيف</th>
                <th className="text-center p-4">الكمية</th>
                <th className="text-center p-4">الوحدة</th>
                <th className="text-center p-4">حدد التنبيه</th>
                {canViewFinancials && <th className="text-center p-4">سعر الشراء</th>}
                {canViewFinancials && <th className="text-center p-4">البيع (عادي)</th>}
                {canViewFinancials && <th className="text-center p-4">البيع (مكاتب)</th>}
                <th className="text-center p-4">الحالة</th>
                <th className="text-center p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isLowStock = item.quantity <= item.alert_threshold;
                
                return (
                  <tr key={item.id} className={`border-b border-border hover:bg-muted/30 transition-colors ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-sm text-muted-foreground">
                        {item.code || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{item.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-muted rounded-full text-sm">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {getUnitLabel(item.unit)}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {item.alert_threshold}
                    </td>
                    {canViewFinancials && (
                      <td className="p-4 text-center font-medium">
                        {formatCurrency(item.purchase_price)}
                      </td>
                    )}
                    {canViewFinancials && (
                      <td className="p-4 text-center font-medium text-primary">
                        {formatCurrency(item.selling_price || 0)}
                      </td>
                    )}
                    {canViewFinancials && (
                      <td className="p-4 text-center font-medium text-accent">
                        {formatCurrency(item.office_selling_price || 0)}
                      </td>
                    )}
                    <td className="p-4 text-center">
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          نقص
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">
                          متوفر
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">لا توجد أصناف مطابقة للبحث</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">إضافة صنف جديد</h2>
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

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">كود الصنف</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input-field"
                    placeholder="مثال: FLX-440"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">اسم الصنف *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="مثال: فلكس 440 جرام"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">التصنيف</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">الوحدة</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="meter">متر</option>
                    <option value="sqm">متر مربع</option>
                    <option value="piece">قطعة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">الكمية</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">حد التنبيه</label>
                  <input
                    type="number"
                    value={formData.alert_threshold}
                    onChange={(e) => setFormData({ ...formData, alert_threshold: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              {canViewFinancials && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">سعر الشراء </label>
                      <input
                        type="number"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">سعر البيع عادي</label>
                      <input
                        type="number"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">شراء مكاتب</label>
                      <input
                        type="number"
                        value={formData.office_purchase_price}
                        onChange={(e) => setFormData({ ...formData, office_purchase_price: Number(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">بيع مكاتب</label>
                      <input
                        type="number"
                        value={formData.office_selling_price}
                        onChange={(e) => setFormData({ ...formData, office_selling_price: Number(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddItem}
                  className="btn-primary flex-1"
                  disabled={!formData.name || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إضافة الصنف'}
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

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">تعديل الصنف</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم الصنف</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="مثال: فلكس 440 جرام"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">التصنيف</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">الوحدة</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="meter">متر</option>
                    <option value="sqm">متر مربع</option>
                    <option value="piece">قطعة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">الكمية</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">حد التنبيه</label>
                  <input
                    type="number"
                    value={formData.alert_threshold}
                    onChange={(e) => setFormData({ ...formData, alert_threshold: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              {canViewFinancials && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">سعر الشراء عادي</label>
                      <input
                        type="number"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">سعر البيع عادي</label>
                      <input
                        type="number"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">شراء مكاتب</label>
                      <input
                        type="number"
                        value={formData.office_purchase_price}
                        onChange={(e) => setFormData({ ...formData, office_purchase_price: Number(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">بيع مكاتب</label>
                      <input
                        type="number"
                        value={formData.office_selling_price}
                        onChange={(e) => setFormData({ ...formData, office_selling_price: Number(e.target.value) })}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateItem}
                  className="btn-primary flex-1"
                  disabled={!formData.name || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التغييرات'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
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

export default Inventory;
