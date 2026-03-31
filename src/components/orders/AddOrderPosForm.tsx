import { useState, useMemo } from 'react';
import { X, Search, Package, Trash2, Calculator, Loader2, Plus } from 'lucide-react';
import { useOrders, useCustomers, useInventory, useOrderInventory, useTransactions, DbInventory } from '@/hooks/useSupabaseData';
import { useOrderItems } from '@/hooks/useOrderItems';
import { formatCurrency } from '@/data/mockData';
import { toast } from 'sonner';

interface AddOrderPosFormProps {
  onClose: () => void;
}

type PosOrderLine = {
  id: string;
  inventory_id: string | null;
  itemName: string;
  unit: string;
  width: number;
  height: number;
  quantity: number;
  unitPrice: number;
  totalArea: number;
  totalPrice: number;
};

export default function AddOrderPosForm({ onClose }: AddOrderPosFormProps) {
  const { addOrder } = useOrders();
  const { customers, addCustomer } = useCustomers();
  const { items: inventoryItems } = useInventory();
  const { addOrderInventoryItems } = useOrderInventory();
  const { addMultipleItems } = useOrderItems();
  const { addTransaction } = useTransactions();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );
  const [customerName, setCustomerName] = useState('');
  const [newCustomerType, setNewCustomerType] = useState<'regular' | 'office'>('regular');

  // Lines State
  const [lines, setLines] = useState<PosOrderLine[]>([]);
  
  // Current Line Input State
  const [currentLine, setCurrentLine] = useState<PosOrderLine>({
    id: '',
    inventory_id: null,
    itemName: '',
    unit: 'sqm',
    width: 0,
    height: 0,
    quantity: 1,
    unitPrice: 0,
    totalArea: 0,
    totalPrice: 0
  });

  const [materialSearch, setMaterialSearch] = useState('');
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);

  // Order Details State
  const [paid, setPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'instapay_alaa' | 'instapay_amr' | 'vodafone_alaa' | 'vodafone_amr'>('cash');
  const [notes, setNotes] = useState('');
  const [customDiscount, setCustomDiscount] = useState(0);

  // Derived Values
  const unfilteredTotal = lines.reduce((sum, line) => sum + line.totalPrice, 0);
  const grandTotal = Math.max(0, unfilteredTotal - customDiscount);
  const remaining = Math.max(0, grandTotal - paid);

  // Customer Filtering
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 10);
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      (c.phone && c.phone.includes(customerSearch))
    ).slice(0, 10);
  }, [customers, customerSearch]);

  // Material Filtering
  const filteredMaterials = useMemo(() => {
    if (!materialSearch) return inventoryItems.slice(0, 15);
    const search = materialSearch.toLowerCase();
    return inventoryItems.filter(item => 
      item.name.toLowerCase().includes(search) || 
      (item.code && item.code.toLowerCase().includes(search))
    ).slice(0, 15);
  }, [inventoryItems, materialSearch]);

  // Update current line calculations
  const updateCurrentLine = (updates: Partial<PosOrderLine>) => {
    setCurrentLine(prev => {
      const next = { ...prev, ...updates };
      
      // Auto calc area
      let area = 1;
      if (next.unit === 'sqm') {
        area = (next.width || 0) * (next.height || 0);
      } else if (next.unit === 'meter') {
        area = (next.width || 0) || (next.height || 0);
      }
      
      next.totalArea = area * (next.quantity || 1);
      next.totalPrice = next.totalArea * (next.unitPrice || 0);
      
      return next;
    });
  };

  const handleSelectMaterial = (item: DbInventory) => {
    const isOffice = selectedCustomerId 
      ? selectedCustomer?.customer_type === 'office'
      : newCustomerType === 'office';
      
    const sellingPrice = isOffice 
      ? (item.office_selling_price || item.selling_price || item.purchase_price * 2)
      : (item.selling_price || item.purchase_price * 2);

    updateCurrentLine({
      inventory_id: item.id,
      itemName: item.name,
      unit: item.unit as any,
      unitPrice: sellingPrice,
    });
    setMaterialSearch('');
    setShowMaterialDropdown(false);
  };

  const handleAddLine = () => {
    if (!currentLine.itemName) {
      toast.error('يجب اختيار الخامة أو كتابة اسم الصنف');
      return;
    }
    if (currentLine.quantity <= 0 || currentLine.unitPrice <= 0) {
      toast.error('الكمية والسعر يجب أن يكونا أكبر من صفر');
      return;
    }

    setLines([...lines, { ...currentLine, id: Date.now().toString() }]);
    
    // Reset current line
    setCurrentLine({
      id: '',
      inventory_id: null,
      itemName: '',
      unit: 'sqm',
      width: 0,
      height: 0,
      quantity: 1,
      unitPrice: 0,
      totalArea: 0,
      totalPrice: 0
    });
  };

  const handleRemoveLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const handleSubmit = async () => {
    if (!customerName) {
      toast.error('يرجى تحديد العميل');
      return;
    }
    if (lines.length === 0) {
      toast.error('يجب إضافة صنف واحد على الأقل للطباعة');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCustomerId = selectedCustomerId;

      // Create customer if needed
      if (!finalCustomerId) {
        const existing = customers.find(c => c.name.toLowerCase().trim() === customerName.toLowerCase().trim());
        if (existing) {
          finalCustomerId = existing.id;
        } else {
          const newCust = await addCustomer({ 
            name: customerName, 
            phone: null, 
            notes: null, 
            customer_type: newCustomerType 
          });
          if (newCust) {
            finalCustomerId = newCust.id;
            toast.success(`تم إضافة العميل "${customerName}" للسيستم`);
          }
        }
      }

      // Prepare print order summaries
      const workType = lines.length === 1 ? lines[0].itemName : `إذن طباعة مجمع (${lines.length} أصناف)`;
      const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);
      const dimensions = lines.length === 1 
        ? `${lines[0].width || ''} × ${lines[0].height || ''}`.trim() 
        : 'مقاسات متعددة';

      // 1. Create Print Order
      const newOrder = await addOrder({
        customer_id: finalCustomerId || null,
        customer_name: customerName,
        work_type: workType,
        dimensions: dimensions,
        quantity: totalQuantity,
        price: grandTotal,
        paid: paid,
        status: 'new',
        notes: notes || null
      });

      if (!newOrder) throw new Error('فشل إنشاء الطلب');

      // 1.5 Create Income Transaction for the paid amount
      if (paid > 0) {
        await addTransaction({
          type: 'income',
          category: 'إيراد طلبات طباعة',
          amount: paid,
          description: `مقدم إذن طباعة للعميل ${customerName}`,
          order_id: newOrder.id,
          payment_method: paymentMethod,
          recipient: customerName,
        });
      }

      // 2. Prepare order items strings
      const orderItemsList = lines.map(line => ({
        item_name: line.itemName,
        description: `${line.quantity} × ${line.itemName} ${line.unit === 'sqm' ? `(${line.width}x${line.height})` : ''}`,
        quantity: line.quantity
      }));
      await addMultipleItems(newOrder.id, orderItemsList);

      // 3. Deduct inventory for lines linked to an inventory item
      const invLines = lines.filter(l => l.inventory_id);
      if (invLines.length > 0) {
        const payload = invLines.map(l => ({
          inventory_id: l.inventory_id!,
          quantity_used: l.totalArea
        }));
        await addOrderInventoryItems(newOrder.id, payload);
      }

      toast.success('تم إنشاء إذن الطباعة وخصم الخامات بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ الإذن');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-5xl animate-scale-in shadow-2xl my-8 border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">نظام إذن الطباعة المتقدم (آلة حاسبة)</h2>
              <p className="text-sm text-muted-foreground">أضف الخامات المتعددة وسيتم الحساب والخصم آلياً</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-destructive hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* 1. Customer Selection */}
          <div className="bg-muted/30 p-5 rounded-xl border border-border relative">
            <label className="block text-sm font-bold text-primary mb-3">بيانات العميل</label>
            <div className="relative">
              <input
                type="text"
                value={customerSearch || customerName}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerName(e.target.value);
                  setSelectedCustomerId(null);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="input-field max-w-md bg-background"
                placeholder="ابحث عن عميل موجود أو اكتب اسم عميل جديد..."
              />
              
              {showCustomerDropdown && customerSearch && (
                <div className="absolute top-12 left-0 w-full max-w-md bg-card border border-border rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(cust => (
                      <button
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setCustomerName(cust.name);
                          setCustomerSearch('');
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-right p-3 hover:bg-primary/10 transition-colors border-b border-border last:border-0 block"
                      >
                        <span className="font-bold block">{cust.name}</span>
                        {cust.phone && <span className="text-xs text-muted-foreground">{cust.phone}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-muted-foreground text-sm text-center">سيتم تسجيل "{customerSearch}" كعميل جديد</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Order Lines Definition */}
          <div className="bg-card p-5 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-primary">إضافة طلبات وخامات للإذن</label>
            </div>

            {/* Current Input Line */}
            <div className="grid grid-cols-12 gap-3 items-end bg-primary/5 p-4 rounded-xl border border-primary/20">
              <div className="col-span-12 md:col-span-3 relative">
                <label className="block text-xs text-muted-foreground mb-1">الخامة أو الصنف</label>
                <input
                  type="text"
                  value={materialSearch || currentLine.itemName}
                  onChange={(e) => {
                    setMaterialSearch(e.target.value);
                    updateCurrentLine({ itemName: e.target.value, inventory_id: null });
                    setShowMaterialDropdown(true);
                  }}
                  onFocus={() => setShowMaterialDropdown(true)}
                  className="input-field text-sm bg-background border-primary/30 focus:border-primary"
                  placeholder="ابحث عن خامة..."
                />
                
                {showMaterialDropdown && materialSearch && (
                  <div className="absolute top-full right-0 w-full md:w-80 mt-1 bg-card border border-border rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
                    {filteredMaterials.map(mat => (
                      <button
                        key={mat.id}
                        onClick={() => handleSelectMaterial(mat)}
                        className="w-full text-right p-3 hover:bg-primary/10 transition-colors border-b border-border flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold block text-sm">{mat.name}</span>
                          <span className="text-xs text-muted-foreground">{mat.code || 'بدون كود'}</span>
                        </div>
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{mat.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-4 md:col-span-1">
                <label className="block text-xs text-muted-foreground mb-1">الكمية</label>
                <input
                  type="number"
                  min={1}
                  value={currentLine.quantity || ''}
                  onChange={e => updateCurrentLine({ quantity: Number(e.target.value) })}
                  className="input-field text-center font-bold"
                />
              </div>

              <div className="col-span-4 md:col-span-1">
                <label className="block text-xs text-muted-foreground mb-1">العرض (m)</label>
                <input
                  type="number"
                  disabled={currentLine.unit === 'piece'}
                  value={currentLine.width || ''}
                  onChange={e => updateCurrentLine({ width: Number(e.target.value) })}
                  className="input-field text-center disabled:opacity-50"
                />
              </div>

              <div className="col-span-4 md:col-span-1">
                <label className="block text-xs text-muted-foreground mb-1">الطول (m)</label>
                <input
                  type="number"
                  disabled={currentLine.unit === 'piece'}
                  value={currentLine.height || ''}
                  onChange={e => updateCurrentLine({ height: Number(e.target.value) })}
                  className="input-field text-center disabled:opacity-50"
                />
              </div>

              <div className="col-span-6 md:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">سعر البيع للوحدة</label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentLine.unitPrice || ''}
                    onChange={e => updateCurrentLine({ unitPrice: Number(e.target.value) })}
                    className="input-field pl-8 font-bold text-accent"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">ج.م</span>
                </div>
              </div>

              <div className="col-span-6 md:col-span-2 text-center bg-background rounded-lg border border-border p-2">
                <label className="block text-xs text-muted-foreground">الإجمالي</label>
                <span className="font-bold text-lg text-primary">{formatCurrency(currentLine.totalPrice)}</span>
              </div>

              <div className="col-span-12 md:col-span-2">
                <button
                  onClick={handleAddLine}
                  className="w-full btn-primary py-3 hover:scale-105 active:scale-95"
                >
                  <Plus className="w-5 h-5 mx-auto" />
                </button>
              </div>
            </div>

            {/* Lines List */}
            {lines.length > 0 && (
              <div className="mt-6 border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-foreground">
                    <tr>
                      <th className="py-3 px-4 text-right">الصنف</th>
                      <th className="py-3 px-4 text-center">المقاس</th>
                      <th className="py-3 px-4 text-center">الكمية</th>
                      <th className="py-3 px-4 text-center">الاستهلاك</th>
                      <th className="py-3 px-4 text-center">السعر</th>
                      <th className="py-3 px-4 text-left">الإجمالي</th>
                      <th className="py-3 px-4 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={l.id} className="border-t border-border bg-background hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold block text-primary">{l.itemName}</span>
                          {l.inventory_id ? <span className="text-xs text-success">مربوط بالمخزن ✓</span> : <span className="text-xs text-muted-foreground">صنف مانيوال</span>}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {l.unit === 'sqm' ? `${l.width} × ${l.height}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {l.quantity}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {Math.round(l.totalArea * 100)/100} <span className="text-xs opacity-70">{l.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground">
                          {formatCurrency(l.unitPrice)}
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-lg">
                          {formatCurrency(l.totalPrice)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => handleRemoveLine(l.id)} className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive hover:text-white transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {lines.length === 0 && (
              <div className="mt-4 p-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لم يتم إضافة أي أصناف بعد للإذن</p>
              </div>
            )}
          </div>

          {/* 3. Totals and Checkout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted/30 p-5 rounded-xl border border-border">
              <label className="block text-sm font-bold text-primary mb-3">ملاحظات والتفاصيل</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input-field min-h-[120px] bg-background"
                placeholder="تفاصيل التقفيل والتشطيب أو أي ملاحظة للعميل والمطبعة..."
              />
            </div>
            
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-xl border border-primary/20 space-y-4">
              <div className="flex justify-between items-center text-sm text-foreground">
                <span>إجمالي الأصناف:</span>
                <span className="font-bold">{formatCurrency(unfilteredTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-foreground">
                <span className="flex items-center gap-2">خصم (إن وجد):</span>
                <input 
                  type="number" 
                  value={customDiscount || ''} 
                  onChange={e => setCustomDiscount(Number(e.target.value))}
                  className="input-field w-32 py-1 text-center font-bold text-destructive"
                  placeholder="0.00"
                />
              </div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold text-foreground">الإجمالي النهائي:</span>
                <span className="font-black text-2xl text-primary">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="font-bold text-success w-1/3">المدفوع:</span>
                <div className="flex gap-2 flex-1 relative">
                  <input 
                    type="number" 
                    value={paid || ''} 
                    onChange={e => setPaid(Number(e.target.value))}
                    className="input-field flex-1 text-center font-bold text-success text-sm md:text-lg"
                    placeholder="0.00"
                  />
                  <select 
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="input-field w-24 md:w-32 text-xs md:text-sm p-1"
                  >
                    <option value="cash">كاش</option>
                    <option value="vodafone_alaa">فودافون (علاء)</option>
                    <option value="vodafone_amr">فودافون (عمرو)</option>
                    <option value="instapay_alaa">انستا (علاء)</option>
                    <option value="instapay_amr">انستا (عمرو)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-destructive">المتبقي:</span>
                <span className="font-black text-xl text-destructive">{formatCurrency(remaining)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-background rounded-b-2xl flex items-center justify-end gap-4">
          <button onClick={onClose} className="btn-outline px-8 py-3">إلغاء</button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || lines.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-12 py-3 rounded-lg font-bold text-lg flex items-center gap-2 shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:pointer-events-none transform active:scale-95"
          >
            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'حفظ وإنشاء الإذن'}
          </button>
        </div>

      </div>
    </div>
  );
}
