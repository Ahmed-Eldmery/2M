import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, Edit, Printer, X, ArrowLeft, AlertCircle, Loader2, Sparkles, Package, Trash2, ListChecks } from 'lucide-react';
import { useOrders, useCustomers, useInventory, useOrderInventory, useTransactions, DbPrintOrder, DbInventory } from '@/hooks/useSupabaseData';
import { useOrderItems } from '@/hooks/useOrderItems';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, workTypes } from '@/data/mockData';
import { toast } from 'sonner';
import OrderReceipt from '@/components/print/OrderReceipt';
import ExcelImportExport from '@/components/ExcelImportExport';
import OrderItemsManager from '@/components/orders/OrderItemsManager';
import AddOrderPosForm from '@/components/orders/AddOrderPosForm';
import { useReactToPrint } from 'react-to-print';

type OrderStatus = DbPrintOrder['status'];

const statusOptions: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: 'new', label: 'جديد' },
  { value: 'design', label: 'قيد التصميم' },
  { value: 'printing', label: 'قيد الطباعة' },
  { value: 'printed', label: 'تم الطباعة' },
  { value: 'waiting_outside', label: 'العميل بالخارج' },
  { value: 'delivered', label: 'تم التسليم' },
];

const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState<DbPrintOrder | null>(null);
  const [showWaitingPopup, setShowWaitingPopup] = useState<DbPrintOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<DbPrintOrder | null>(null);
  const [printOrder, setPrintOrder] = useState<DbPrintOrder | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { orders, loading, addOrder, updateOrderStatus, updateOrder, fetchOrders, deleteMultipleOrders } = useOrders();
  const { addTransaction } = useTransactions();
  const { customers, addCustomer } = useCustomers();
  const { items: inventoryItems } = useInventory();
  const { addOrderInventoryItems } = useOrderInventory();
  const { hasRole, isOwner, isOwnerOrAccountant } = useAuth();
  const canViewFinancials = isOwnerOrAccountant();

  const printRef = useRef<HTMLDivElement>(null);

  // Track seen orders for "new" indicators
  const [seenOrders, setSeenOrders] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('seenOrders');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printOrder ? `إذن_${printOrder.order_number}` : 'إذن_طباعة',
    onAfterPrint: () => setPrintOrder(null),
  });

  const [notes, setNotes] = useState('');
  
  // Printing State
  const [showPrinterPrompt, setShowPrinterPrompt] = useState(false);
  const [printerName, setPrinterName] = useState('');
  const [pendingPrintOrder, setPendingPrintOrder] = useState<DbPrintOrder | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    work_type: 'بنر خارجي',
    dimensions: '',
    quantity: 1,
    price: 0,
    paid: 0,
    notes: '',
  });

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Filter customers based on search
  const filteredCustomersList = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
    ).slice(0, 10);
  }, [customers, customerSearch]);

  // Material selection state
  const [selectedMaterials, setSelectedMaterials] = useState<{ inventory_id: string; quantity_used: number; name: string; unit?: string }[]>([]);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');

  // Filter inventory items based on search (by code or name)
  const filteredInventoryItems = useMemo(() => {
    if (!materialSearch) return inventoryItems.slice(0, 20);
    const search = materialSearch.toLowerCase();
    return inventoryItems.filter(item =>
      item.name.toLowerCase().includes(search) ||
      (item.code && item.code.toLowerCase().includes(search))
    ).slice(0, 20);
  }, [inventoryItems, materialSearch]);

  // Order items state (for new orders)
  const [orderItems, setOrderItems] = useState<{ item_name: string; description?: string; quantity: number }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to calculate automatic material usage area
  const calculateTotalArea = (dimensionsStr: string, qty: number) => {
    if (!dimensionsStr) return qty;
    const cleanStr = dimensionsStr.replace(/[xX×*]/g, '*').replace(/[^0-9.*]/g, '');
    try {
      const parts = cleanStr.split('*').filter(p => p !== '');
      if (parts.length > 0) {
        let area = 1;
        for (const part of parts) {
          const num = parseFloat(part);
          if (!isNaN(num) && num > 0) {
            area *= num;
          }
        }
        return Math.round((area * qty) * 100) / 100;
      }
    } catch (e) {
      console.error(e);
    }
    return qty;
  };

  const updateMaterialQuantities = (newDim: string, newQty: number) => {
    setSelectedMaterials(prev => prev.map(m => {
       if (m.unit === 'sqm' || m.unit === 'meter') {
          return { ...m, quantity_used: calculateTotalArea(newDim, newQty) };
       }
       if (m.unit === 'piece') {
          return { ...m, quantity_used: newQty };
       }
       return m;
    }));
  };
  
  // For adding items to existing orders
  const { addMultipleItems } = useOrderItems();

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowAddModal(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const [dismissedWaitingOrders, setDismissedWaitingOrders] = useState<Set<string>>(new Set());

  // Show popup for waiting_outside orders
  useEffect(() => {
    const waitingOrders = orders.filter(o => o.status === 'waiting_outside' && !dismissedWaitingOrders.has(o.id));
    if (waitingOrders.length > 0 && (hasRole('printer') || isOwner())) {
      const latestWaiting = waitingOrders[0];
      if (!showWaitingPopup || showWaitingPopup.id !== latestWaiting.id) {
        setShowWaitingPopup(latestWaiting);
      }
    } else if (showWaitingPopup && waitingOrders.length === 0) {
      setShowWaitingPopup(null);
    }
  }, [orders, hasRole, isOwner, showWaitingPopup, dismissedWaitingOrders]);

  // Mark orders as seen when viewed
  const markAsSeen = (orderId: string) => {
    setSeenOrders(prev => {
      const updated = new Set(prev);
      updated.add(orderId);
      localStorage.setItem('seenOrders', JSON.stringify([...updated]));
      return updated;
    });
  };

  const isNewOrder = (order: DbPrintOrder) => {
    const createdAt = new Date(order.created_at);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return createdAt > dayAgo && !seenOrders.has(order.id);
  };

  const getStatusCounts = () => {
    const counts: Record<string, { total: number; new: number }> = {};
    statusOptions.forEach(opt => {
      const filtered = opt.value === 'all' 
        ? orders 
        : orders.filter(o => o.status === opt.value);
      counts[opt.value] = {
        total: filtered.length,
        new: filtered.filter(o => isNewOrder(o)).length,
      };
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`هل أنت متأكد من حذف ${selectedIds.size} طلبات؟`)) {
      try {
        setIsSubmitting(true);
        await deleteMultipleOrders(Array.from(selectedIds));
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

  const toggleSelectAll = (filteredOrders: DbPrintOrder[]) => {
    if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.includes(searchQuery) || 
      order.customer_name.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      new: 'design',
      design: 'printing',
      printing: 'printed',
      printed: 'waiting_outside',
      waiting_outside: 'delivered',
      delivered: null,
    };
    return flow[currentStatus];
  };

  const getPrevStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      new: null,
      design: 'new',
      printing: 'design',
      printed: 'printing',
      waiting_outside: 'printed',
      delivered: 'waiting_outside',
    };
    return flow[currentStatus];
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrderStatus(orderId, newStatus);
    markAsSeen(orderId);
    
    if (newStatus === 'waiting_outside') {
      toast.info('تم تحويل العميل للانتظار بالخارج');
    }
  };

  const handleAddOrder = async () => {
    if (!formData.customer_name || !formData.dimensions || formData.price <= 0) return;

    setIsSubmitting(true);
    try {
      let customerId = formData.customer_id;

      // Check if customer exists by name or create new one
      if (!customerId && formData.customer_name) {
        const existingCustomer = customers.find(
          c => c.name.toLowerCase().trim() === formData.customer_name.toLowerCase().trim()
        );
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Create new customer automatically
          const newCustomer = await addCustomer({
            name: formData.customer_name,
            phone: null,
            notes: null,
            customer_type: 'regular',
          });
          if (newCustomer) {
            customerId = newCustomer.id;
            toast.success(`تم إضافة العميل "${formData.customer_name}" تلقائياً`);
          }
        }
      }

      const newOrder = await addOrder({
        customer_id: customerId || null,
        customer_name: formData.customer_name,
        work_type: formData.work_type,
        dimensions: formData.dimensions,
        quantity: formData.quantity,
        price: formData.price,
        paid: formData.paid,
        status: 'new',
        notes: formData.notes || null,
      });

      // Add material deduction if materials were selected
      if (selectedMaterials.length > 0 && newOrder) {
        await addOrderInventoryItems(
          newOrder.id,
          selectedMaterials.map(m => ({ inventory_id: m.inventory_id, quantity_used: m.quantity_used }))
        );
      }

      // Add order items if any were added
      if (orderItems.length > 0 && newOrder) {
        await addMultipleItems(newOrder.id, orderItems);
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;

    setIsSubmitting(true);
    try {
      // Check for payment update to sync with transactions
      if (formData.paid > editingOrder.paid) {
        const extraPayment = formData.paid - editingOrder.paid;
        await addTransaction({
          type: 'income',
          amount: extraPayment,
          category: 'طباعة',
          description: `دفعة متبقية - طلب رقم ${editingOrder.order_number} - ${editingOrder.customer_name}`,
          order_id: editingOrder.id,
          payment_method: 'cash', // Default to cash for updates
          recipient: null,
        });
        toast.success(`تم تسجيل دفعة إضافية بقيمة ${extraPayment} ج.م`);
      }

      await updateOrder(editingOrder.id, {
        customer_name: formData.customer_name,
        work_type: formData.work_type,
        dimensions: formData.dimensions,
        quantity: formData.quantity,
        price: formData.price,
        paid: formData.paid,
        notes: formData.notes || null,
      });
      setShowEditModal(false);
      setEditingOrder(null);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      work_type: 'بنر خارجي',
      dimensions: '',
      quantity: 1,
      price: 0,
      paid: 0,
      notes: '',
    });
    setSelectedMaterials([]);
    setOrderItems([]);
    setCustomerSearch('');
    setMaterialSearch('');
    setShowCustomerDropdown(false);
    setShowMaterialSelector(false);
  };

  const addMaterial = (item: DbInventory) => {
    if (selectedMaterials.find(m => m.inventory_id === item.id)) {
      toast.error('هذا الصنف مضاف بالفعل');
      return;
    }

    let automaticQuantity = formData.quantity;
    if (item.unit === 'sqm' || item.unit === 'meter') {
      automaticQuantity = calculateTotalArea(formData.dimensions, formData.quantity);
    }

    setSelectedMaterials([...selectedMaterials, {
      inventory_id: item.id,
      quantity_used: automaticQuantity,
      name: item.name,
      unit: item.unit
    }]);
    setShowMaterialSelector(false);
  };

  const removeMaterial = (inventoryId: string) => {
    setSelectedMaterials(selectedMaterials.filter(m => m.inventory_id !== inventoryId));
  };

  const updateMaterialQuantity = (inventoryId: string, quantity: number) => {
    setSelectedMaterials(selectedMaterials.map(m => 
      m.inventory_id === inventoryId ? { ...m, quantity_used: quantity } : m
    ));
  };

  const openEditModal = (order: DbPrintOrder) => {
    setFormData({
      customer_id: order.customer_id || '',
      customer_name: order.customer_name,
      work_type: order.work_type,
      dimensions: order.dimensions || '',
      quantity: order.quantity,
      price: order.price,
      paid: order.paid,
      notes: order.notes || '',
    });
    setEditingOrder(order);
    setShowEditModal(true);
    markAsSeen(order.id);
  };

  const openPrintModal = (order: DbPrintOrder) => {
    setPendingPrintOrder(order);
    setShowPrinterPrompt(true);
  };

  const confirmPrint = () => {
    if (!pendingPrintOrder) return;
    
    // Create a temporary order object with the printer name
    const orderWithPrinter = {
      ...pendingPrintOrder,
      printed_by: printerName || 'غير محدد'
    };
    
    setPrintOrder(orderWithPrinter);
    setShowPrinterPrompt(false);
    setTimeout(() => {
      handlePrint();
      setPrinterName('');
      setPendingPrintOrder(null);
    }, 100);
  };

  const getUpdatedStatusLabel = (status: OrderStatus) => {
    const labels: Record<OrderStatus, string> = {
      new: 'جديد',
      design: 'قيد التصميم',
      printing: 'قيد الطباعة',
      printed: 'تم الطباعة',
      waiting_outside: 'العميل بالخارج',
      delivered: 'تم التسليم',
    };
    return labels[status] || status;
  };

  const getUpdatedStatusClass = (status: OrderStatus) => {
    const classes: Record<OrderStatus, string> = {
      new: 'bg-info/15 text-info',
      design: 'bg-secondary/15 text-secondary',
      printing: 'bg-primary/15 text-primary',
      printed: 'bg-accent/15 text-accent',
      waiting_outside: 'bg-warning/15 text-warning',
      delivered: 'bg-success/15 text-success',
    };
    return classes[status] || 'bg-muted text-muted-foreground';
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
      {/* Hidden Print Component */}
      <div className="hidden">
        <div ref={printRef}>
          {printOrder && <OrderReceipt order={printOrder} />}
        </div>
      </div>

      {/* Printer Name Prompt */}
      {showPrinterPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm animate-scale-in">
            <h2 className="text-xl font-bold text-foreground mb-4">من يقوم بالطباعة؟</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم الموظف</label>
                <input
                  type="text"
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                  className="input-field"
                  placeholder="مثال: أحمد، محمد، ..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmPrint();
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmPrint}
                  className="btn-primary flex-1"
                >
                  تأكيد وطباعة
                </button>
                <button
                  onClick={() => {
                    setShowPrinterPrompt(false);
                    setPendingPrintOrder(null);
                    setPrinterName('');
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">أوامر الطباعة</h1>
          <p className="text-muted-foreground">إدارة ومتابعة أوامر الطباعة والتسليم</p>
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
          <ExcelImportExport tableName="print_orders" onImportComplete={fetchOrders} />
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            إذن طباعة جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث برقم الإذن أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pr-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg border border-border">
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === filteredOrders.length}
                onChange={() => toggleSelectAll(filteredOrders)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-sm font-medium text-muted-foreground">تحديد الكل</span>
            </div>
            {statusOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === option.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.label}
                {statusCounts[option.value]?.new > 0 && (
                  <span className="absolute -top-1 -left-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center animate-pulse">
                    {statusCounts[option.value].new}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const nextStatus = getNextStatus(order.status);
          const prevStatus = getPrevStatus(order.status);
          const isNew = isNewOrder(order);
          const isSelected = selectedIds.has(order.id);

          return (
            <div 
              key={order.id} 
              className={`glass-card p-6 hover:shadow-lg transition-all relative ${isNew ? 'ring-2 ring-primary bg-primary/5' : ''} ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}`}
            >
              <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(order.id)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {isNew && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-bounce">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Order Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {order.order_number.split('-').pop()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-foreground">{order.customer_name}</h3>
                      <span className={`status-badge ${getUpdatedStatusClass(order.status)}`}>
                        {getUpdatedStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.work_type} • {order.dimensions} • {order.quantity} قطعة
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.order_number} • {new Date(order.created_at).toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                {canViewFinancials && (
                  <div className="flex items-center gap-6 lg:gap-8">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">الإجمالي</p>
                      <p className="text-lg font-bold text-foreground">{formatCurrency(order.price)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">المدفوع</p>
                      <p className="text-lg font-bold text-success">{formatCurrency(order.paid)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">المتبقي</p>
                      <p className={`text-lg font-bold ${order.remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                        {formatCurrency(order.remaining)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Previous Status Button */}
                  {prevStatus && isOwnerOrAccountant() && (
                    <button 
                      onClick={() => handleStatusChange(order.id, prevStatus)}
                      className="btn-outline text-sm py-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      رجوع
                    </button>
                  )}
                  
                  {/* Next Status Button */}
                  {nextStatus && (
                    <button 
                      onClick={() => handleStatusChange(order.id, nextStatus)}
                      className="btn-secondary text-sm py-2"
                    >
                      نقل إلى {getUpdatedStatusLabel(nextStatus)}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      setShowViewModal(order);
                      markAsSeen(order.id);
                    }}
                    className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    title="عرض التفاصيل"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => openPrintModal(order)}
                    className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    title="طباعة الإذن"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => openEditModal(order)}
                    className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                    title="تعديل"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Printer className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">لا توجد أوامر طباعة مطابقة للبحث</p>
        </div>
      )}

      {/* Waiting Outside Popup */}
      {showWaitingPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md animate-scale-in border-2 border-warning">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">عميل بالخارج!</h2>
                <p className="text-sm text-muted-foreground">يوجد عميل ينتظر استلام طلبه</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="font-bold text-lg text-foreground mb-2">{showWaitingPopup.customer_name}</p>
              <p className="text-sm text-muted-foreground">
                {showWaitingPopup.work_type} • {showWaitingPopup.dimensions}
              </p>
              <p className="text-sm text-muted-foreground">
                رقم الإذن: {showWaitingPopup.order_number}
              </p>
              <div className="mt-2 pt-2 border-t border-border">
                <span className={`font-bold ${showWaitingPopup.remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                  المتبقي: {formatCurrency(showWaitingPopup.remaining)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  handleStatusChange(showWaitingPopup.id, 'delivered');
                  setShowWaitingPopup(null);
                }}
                className="btn-primary flex-1"
              >
                تم التسليم
              </button>
              <button
                onClick={() => openPrintModal(showWaitingPopup)}
                className="btn-outline"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setDismissedWaitingOrders(prev => new Set(prev).add(showWaitingPopup.id));
                  setShowWaitingPopup(null);
                }}
                className="btn-outline flex-1"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">تفاصيل الإذن</h2>
              <button 
                onClick={() => setShowViewModal(null)}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رقم الإذن</p>
                  <p className="font-bold text-primary">{showViewModal.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <span className={`status-badge ${getUpdatedStatusClass(showViewModal.status)}`}>
                    {getUpdatedStatusLabel(showViewModal.status)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">العميل</p>
                <p className="font-bold text-foreground">{showViewModal.customer_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">نوع العمل</p>
                  <p className="font-medium text-foreground">{showViewModal.work_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المقاسات</p>
                  <p className="font-medium text-foreground">{showViewModal.dimensions}</p>
                </div>
              </div>

              {canViewFinancials && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">الإجمالي</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(showViewModal.price)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">المدفوع</p>
                    <p className="text-xl font-bold text-success">{formatCurrency(showViewModal.paid)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">المتبقي</p>
                    <p className={`text-xl font-bold ${showViewModal.remaining > 0 ? 'text-destructive' : 'text-success'}`}>
                      {formatCurrency(showViewModal.remaining)}
                    </p>
                  </div>
                </div>
              )}

              {/* Order Items with delivery tracking */}
              <OrderItemsManager orderId={showViewModal.id} />

              {showViewModal.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">ملاحظات</p>
                  <p className="font-medium text-foreground bg-muted/50 p-2 rounded">{showViewModal.notes}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    openPrintModal(showViewModal);
                    setShowViewModal(null);
                  }}
                  className="btn-primary flex-1"
                >
                  <Printer className="w-4 h-4" />
                  طباعة الإذن
                </button>
                <button
                  onClick={() => {
                    openEditModal(showViewModal);
                    setShowViewModal(null);
                  }}
                  className="btn-outline flex-1"
                >
                  <Edit className="w-4 h-4" />
                  تعديل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal POS Form */}
      {showAddModal && (
        <AddOrderPosForm onClose={() => {
          setShowAddModal(false);
          fetchOrders(); // Refresh orders after adding
        }} />
      )}

      {/* Edit Modal */}
      {showEditModal && editingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg animate-scale-in my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">تعديل الإذن - {editingOrder.order_number}</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingOrder(null);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم العميل</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="input-field"
                  placeholder="اسم العميل"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">نوع العمل</label>
                  <select
                    value={formData.work_type}
                    onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                    className="input-field"
                  >
                    {workTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">المقاسات</label>
                  <input
                    type="text"
                    value={formData.dimensions}
                    onChange={(e) => {
                      const newDim = e.target.value;
                      setFormData({ ...formData, dimensions: newDim });
                      updateMaterialQuantities(newDim, formData.quantity);
                    }}
                    className="input-field"
                    placeholder="مثال: 3 × 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">الكمية</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => {
                      const newQty = Number(e.target.value);
                      setFormData({ ...formData, quantity: newQty });
                      updateMaterialQuantities(formData.dimensions, newQty);
                    }}
                    className="input-field"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">السعر</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="input-field"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">المدفوع</label>
                  <input
                    type="number"
                    value={formData.paid}
                    onChange={(e) => setFormData({ ...formData, paid: Number(e.target.value) })}
                    className="input-field"
                    min={0}
                  />
                </div>
              </div>

              {/* Order Items Management */}
              <OrderItemsManager orderId={editingOrder.id} isEditing />

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder="أي ملاحظات..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateOrder}
                  className="btn-primary flex-1"
                  disabled={!formData.customer_name || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التغييرات'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingOrder(null);
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

export default Orders;
