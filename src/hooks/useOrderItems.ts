import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DbOrderItem {
  id: string;
  order_id: string;
  item_name: string;
  description: string | null;
  quantity: number;
  is_delivered: boolean;
  delivered_at: string | null;
  created_at: string;
}

export function useOrderItems(orderId?: string) {
  const [items, setItems] = useState<DbOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!orderId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching order items:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchItems();

    if (!orderId) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-items-${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new as DbOrderItem]);
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new as DbOrderItem : i));
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems, orderId]);

  const addItem = async (item: Omit<DbOrderItem, 'id' | 'created_at' | 'is_delivered' | 'delivered_at'>) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .insert([{ ...item, is_delivered: false }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error adding order item:', error);
      toast.error('خطأ في إضافة العنصر');
      throw error;
    }
  };

  const addMultipleItems = async (orderIdParam: string, items: { item_name: string; description?: string; quantity: number }[]) => {
    try {
      const itemsWithOrderId = items.map(item => ({
        order_id: orderIdParam,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity,
        is_delivered: false
      }));

      const { data, error } = await supabase
        .from('order_items')
        .insert(itemsWithOrderId)
        .select();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error adding order items:', error);
      toast.error('خطأ في إضافة العناصر');
      throw error;
    }
  };

  const toggleDelivered = async (itemId: string, isDelivered: boolean) => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .update({ 
          is_delivered: isDelivered,
          delivered_at: isDelivered ? new Date().toISOString() : null
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error updating order item:', error);
      toast.error('خطأ في تحديث العنصر');
      throw error;
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting order item:', error);
      toast.error('خطأ في حذف العنصر');
      throw error;
    }
  };

  return { items, loading, fetchItems, addItem, addMultipleItems, toggleDelivered, deleteItem };
}
