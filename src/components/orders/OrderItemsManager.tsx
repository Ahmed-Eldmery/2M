import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Loader2, ListChecks } from 'lucide-react';
import { useOrderItems, DbOrderItem } from '@/hooks/useOrderItems';
import { Checkbox } from '@/components/ui/checkbox';

interface OrderItemsManagerProps {
  orderId?: string;
  isEditing?: boolean;
  localItems?: { item_name: string; description?: string; quantity: number }[];
  onLocalItemsChange?: (items: { item_name: string; description?: string; quantity: number }[]) => void;
}

const OrderItemsManager = ({ orderId, isEditing = false, localItems = [], onLocalItemsChange }: OrderItemsManagerProps) => {
  const { items, loading, toggleDelivered, addItem, deleteItem } = useOrderItems(orderId);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For new orders (no orderId yet), manage items locally
  const isLocalMode = !orderId;

  const handleAddLocalItem = () => {
    if (!newItemName.trim()) return;
    const newItem = {
      item_name: newItemName.trim(),
      description: newItemDesc.trim() || undefined,
      quantity: newItemQty
    };
    onLocalItemsChange?.([...localItems, newItem]);
    setNewItemName('');
    setNewItemDesc('');
    setNewItemQty(1);
    setShowAddForm(false);
  };

  const handleRemoveLocalItem = (index: number) => {
    const updated = localItems.filter((_, i) => i !== index);
    onLocalItemsChange?.(updated);
  };

  const handleAddDbItem = async () => {
    if (!newItemName.trim() || !orderId) return;
    setIsSubmitting(true);
    try {
      await addItem({
        order_id: orderId,
        item_name: newItemName.trim(),
        description: newItemDesc.trim() || null,
        quantity: newItemQty
      });
      setNewItemName('');
      setNewItemDesc('');
      setNewItemQty(1);
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDelivered = async (item: DbOrderItem) => {
    await toggleDelivered(item.id, !item.is_delivered);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
  };

  // Calculate delivery progress
  const deliveredCount = items.filter(i => i.is_delivered).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (deliveredCount / totalCount) * 100 : 0;

  if (loading && orderId) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <ListChecks className="w-4 h-4" />
          عناصر الطلب
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({deliveredCount}/{totalCount} تم تسليمه)
            </span>
          )}
        </label>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          إضافة عنصر
        </button>
      </div>

      {/* Progress Bar (only show for existing orders with items) */}
      {orderId && totalCount > 0 && (
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              progressPercent === 100 ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="border border-border rounded-lg p-3 bg-muted/30 space-y-3">
          <div>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="input-field"
              placeholder="اسم العنصر (مثال: بنر 3×1)"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <input
                type="text"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="input-field"
                placeholder="وصف (اختياري)"
              />
            </div>
            <div>
              <input
                type="number"
                value={newItemQty}
                onChange={(e) => setNewItemQty(Number(e.target.value))}
                className="input-field text-center"
                min={1}
                placeholder="الكمية"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={isLocalMode ? handleAddLocalItem : handleAddDbItem}
              disabled={!newItemName.trim() || isSubmitting}
              className="btn-primary flex-1 py-2 text-sm"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'إضافة'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn-outline py-2 text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Items List - Local Mode (for new orders) */}
      {isLocalMode && localItems.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border">
          {localItems.map((item, index) => (
            <div key={index} className="p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-foreground">{item.item_name}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                )}
              </div>
              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {item.quantity}×
              </span>
              <button
                type="button"
                onClick={() => handleRemoveLocalItem(index)}
                className="w-7 h-7 rounded bg-destructive/10 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Items List - DB Mode (for existing orders) */}
      {!isLocalMode && items.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border">
          {items.map((item) => (
            <div 
              key={item.id} 
              className={`p-3 flex items-center gap-3 transition-colors ${
                item.is_delivered ? 'bg-success/5' : ''
              }`}
            >
              <Checkbox
                checked={item.is_delivered}
                onCheckedChange={() => handleToggleDelivered(item)}
                className="data-[state=checked]:bg-success data-[state=checked]:border-success"
              />
              <div className={`flex-1 ${item.is_delivered ? 'line-through text-muted-foreground' : ''}`}>
                <p className="font-medium text-foreground">{item.item_name}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                )}
              </div>
              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {item.quantity}×
              </span>
              {item.is_delivered && (
                <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-success" />
                </div>
              )}
              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="w-7 h-7 rounded bg-destructive/10 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {((isLocalMode && localItems.length === 0) || (!isLocalMode && items.length === 0)) && !showAddForm && (
        <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
          لم تتم إضافة عناصر بعد
        </div>
      )}
    </div>
  );
};

export default OrderItemsManager;
