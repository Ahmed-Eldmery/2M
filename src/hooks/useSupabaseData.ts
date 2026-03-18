import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Attendance Types
export interface DbAttendanceRecord {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string | null;
  check_in_location: string | null;
  check_out_location: string | null;
  notes: string | null;
  status: 'present' | 'late' | 'early_leave' | 'absent';
  created_at: string;
}

// Backup Types
export interface DbBackup {
  id: string;
  backup_name: string;
  backup_type: 'manual' | 'automatic' | 'scheduled';
  file_size: number | null;
  tables_included: string[] | null;
  created_by: string | null;
  created_at: string;
  notes: string | null;
}

// Types matching database schema
export interface DbInventory {
  id: string;
  code: string | null;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  alert_threshold: number;
  purchase_price: number;
  created_at: string;
  updated_at: string;
}

export interface DbInventoryReceipt {
  id: string;
  receipt_number: string;
  supplier_id: string | null;
  supplier_name: string | null;
  notes: string | null;
  total_amount: number;
  created_by: string | null;
  created_at: string;
}

export interface DbInventoryReceiptItem {
  id: string;
  receipt_id: string;
  inventory_id: string | null;
  item_name: string;
  item_code: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface DbOrderInventoryItem {
  id: string;
  order_id: string;
  inventory_id: string;
  quantity_used: number;
  created_at: string;
}

export interface DbCustomer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  customer_type: 'regular' | 'open_account' | 'vip';
  created_at: string;
}

export interface DbPrintOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  work_type: string;
  dimensions: string | null;
  quantity: number;
  price: number;
  paid: number;
  remaining: number;
  status: 'new' | 'design' | 'printing' | 'printed' | 'waiting_outside' | 'delivered';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string | null;
  order_id: string | null;
  payment_method: 'cash' | 'instapay_alaa' | 'instapay_amr' | 'vodafone_alaa' | 'vodafone_amr';
  recipient: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DbEmployee {
  id: string;
  name: string;
  position: string;
  salary: number;
  phone: string | null;
  hire_date: string;
  created_at: string;
}

export interface DbSupplier {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  total_owed: number;
  created_at: string;
}

export interface DbSupplierItem {
  id: string;
  supplier_id: string;
  item_name: string;
  price: number;
  notes: string | null;
}

export interface DbNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

// Inventory hooks
export function useInventory() {
  const [items, setItems] = useState<DbInventory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast.error('خطأ في تحميل المخزن');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (item: { name: string; category: string; unit: string; quantity: number; alert_threshold: number; purchase_price: number; code?: string | null }) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      setItems(prev => [data, ...prev]);
      toast.success('تمت إضافة الصنف بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error adding inventory item:', error);
      toast.error('خطأ في إضافة الصنف');
      throw error;
    }
  };

  const updateItem = async (id: string, updates: Partial<DbInventory>) => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setItems(prev => prev.map(item => item.id === id ? data : item));
      toast.success('تم تحديث الصنف بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error updating inventory item:', error);
      toast.error('خطأ في تحديث الصنف');
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success('تم حذف الصنف بنجاح');
    } catch (error: any) {
      console.error('Error deleting inventory item:', error);
      toast.error('خطأ في حذف الصنف');
      throw error;
    }
  };

  return { items, loading, fetchItems, addItem, updateItem, deleteItem };
}

// Inventory Receipts hooks
export function useInventoryReceipts() {
  const [receipts, setReceipts] = useState<(DbInventoryReceipt & { items?: DbInventoryReceiptItem[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchReceipts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_receipts')
        .select('*, inventory_receipt_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data?.map(r => ({ ...r, items: r.inventory_receipt_items })) || []);
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      toast.error('خطأ في تحميل إيصالات الوارد');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const generateReceiptNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('inventory_receipts')
      .select('*', { count: 'exact', head: true });
    
    return `RCV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const addReceipt = async (
    receipt: Omit<DbInventoryReceipt, 'id' | 'receipt_number' | 'created_at' | 'created_by'>,
    items: Omit<DbInventoryReceiptItem, 'id' | 'receipt_id'>[]
  ) => {
    try {
      const receiptNumber = await generateReceiptNumber();
      
      // Insert receipt
      const { data: receiptData, error: receiptError } = await supabase
        .from('inventory_receipts')
        .insert([{ ...receipt, receipt_number: receiptNumber, created_by: user?.id }])
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Insert receipt items
      const itemsWithReceiptId = items.map(item => ({
        ...item,
        receipt_id: receiptData.id
      }));

      const { error: itemsError } = await supabase
        .from('inventory_receipt_items')
        .insert(itemsWithReceiptId);

      if (itemsError) throw itemsError;

      // Update inventory quantities
      for (const item of items) {
        if (item.inventory_id) {
          const { data: invItem } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('id', item.inventory_id)
            .single();

          if (invItem) {
            await supabase
              .from('inventory')
              .update({ quantity: invItem.quantity + item.quantity })
              .eq('id', item.inventory_id);
          }
        }
      }

      await fetchReceipts();
      toast.success('تم إنشاء إذن الوارد بنجاح');
      return receiptData;
    } catch (error: any) {
      console.error('Error adding receipt:', error);
      toast.error('خطأ في إنشاء إذن الوارد');
      throw error;
    }
  };

  return { receipts, loading, fetchReceipts, addReceipt };
}

// Order Inventory Items hooks
export function useOrderInventory() {
  const addOrderInventoryItems = async (orderId: string, items: { inventory_id: string; quantity_used: number }[]) => {
    try {
      // Insert order inventory items
      const itemsWithOrderId = items.map(item => ({
        ...item,
        order_id: orderId
      }));

      const { error } = await supabase
        .from('order_inventory_items')
        .insert(itemsWithOrderId);

      if (error) throw error;

      // Deduct from inventory
      for (const item of items) {
        const { data: invItem } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('id', item.inventory_id)
          .single();

        if (invItem) {
          await supabase
            .from('inventory')
            .update({ quantity: Math.max(0, invItem.quantity - item.quantity_used) })
            .eq('id', item.inventory_id);
        }
      }

      toast.success('تم خصم الخامات من المخزن');
    } catch (error: any) {
      console.error('Error adding order inventory items:', error);
      toast.error('خطأ في خصم الخامات');
      throw error;
    }
  };

  const getOrderInventoryItems = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_inventory_items')
        .select('*, inventory(*)')
        .eq('order_id', orderId);

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching order inventory items:', error);
      return [];
    }
  };

  return { addOrderInventoryItems, getOrderInventoryItems };
}

// Customers hooks
export function useCustomers() {
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers((data || []) as DbCustomer[]);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error('خطأ في تحميل العملاء');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (customer: Omit<DbCustomer, 'id' | 'created_at' | 'total_orders' | 'total_spent' | 'customer_type'> & { customer_type?: 'regular' | 'open_account' | 'vip' }) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customer, total_orders: 0, total_spent: 0, customer_type: customer.customer_type || 'regular' }])
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => [data as DbCustomer, ...prev]);
      toast.success('تمت إضافة العميل بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast.error('خطأ في إضافة العميل');
      throw error;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<DbCustomer>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setCustomers(prev => prev.map(c => c.id === id ? data as DbCustomer : c));
      toast.success('تم تحديث بيانات العميل بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error('خطأ في تحديث بيانات العميل');
      throw error;
    }
  };

  return { customers, loading, fetchCustomers, addCustomer, updateCustomer };
}

// Orders hooks
export function useOrders() {
  const [orders, setOrders] = useState<DbPrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('print_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('خطأ في تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'print_orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as DbPrintOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as DbPrintOrder : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const generateOrderNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('print_orders')
      .select('*', { count: 'exact', head: true });
    
    return `ORD-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const addOrder = async (order: Omit<DbPrintOrder, 'id' | 'order_number' | 'remaining' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const orderNumber = await generateOrderNumber();
      const { data, error } = await supabase
        .from('print_orders')
        .insert([{ ...order, order_number: orderNumber, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      toast.success('تم إنشاء الإذن بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error adding order:', error);
      toast.error('خطأ في إنشاء الإذن');
      throw error;
    }
  };

  const updateOrderStatus = async (id: string, status: DbPrintOrder['status']) => {
    try {
      const { data, error } = await supabase
        .from('print_orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('تم تحديث حالة الطلب');
      return data;
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error('خطأ في تحديث حالة الطلب');
      throw error;
    }
  };

  const updateOrder = async (id: string, updates: Partial<DbPrintOrder>) => {
    try {
      const { data, error } = await supabase
        .from('print_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('تم تحديث الطلب بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('خطأ في تحديث الطلب');
      throw error;
    }
  };

  return { orders, loading, fetchOrders, addOrder, updateOrderStatus, updateOrder };
}

// Transactions hooks
export function useTransactions() {
  const [transactions, setTransactions] = useState<DbTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as DbTransaction[]);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('خطأ في تحميل المعاملات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (transaction: Omit<DbTransaction, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transaction, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      setTransactions(prev => [data as DbTransaction, ...prev]);
      toast.success('تمت إضافة المعاملة بنجاح');
      return data as DbTransaction;
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      toast.error('خطأ في إضافة المعاملة');
      throw error;
    }
  };

  return { transactions, loading, fetchTransactions, addTransaction };
}

// Employees hooks
export function useEmployees() {
  const [employees, setEmployees] = useState<DbEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('خطأ في تحميل الموظفين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addEmployee = async (employee: Omit<DbEmployee, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();

      if (error) throw error;
      setEmployees(prev => [data, ...prev]);
      toast.success('تمت إضافة الموظف بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast.error('خطأ في إضافة الموظف');
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<DbEmployee>) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setEmployees(prev => prev.map(e => e.id === id ? data : e));
      toast.success('تم تحديث بيانات الموظف بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error('خطأ في تحديث بيانات الموظف');
      throw error;
    }
  };

  return { employees, loading, fetchEmployees, addEmployee, updateEmployee };
}

// Suppliers hooks
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<DbSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      toast.error('خطأ في تحميل الموردين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = async (supplier: Omit<DbSupplier, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplier])
        .select()
        .single();

      if (error) throw error;
      setSuppliers(prev => [data, ...prev]);
      toast.success('تمت إضافة المورد بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error adding supplier:', error);
      toast.error('خطأ في إضافة المورد');
      throw error;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<DbSupplier>) => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setSuppliers(prev => prev.map(s => s.id === id ? data : s));
      toast.success('تم تحديث بيانات المورد بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast.error('خطأ في تحديث بيانات المورد');
      throw error;
    }
  };

  return { suppliers, loading, fetchSuppliers, addSupplier, updateSupplier };
}

// Notifications hooks
export function useNotifications() {
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const notification = payload.new as DbNotification;
          if (notification.user_id === user.id || notification.user_id === null) {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast for waiting_outside notifications
            if (notification.type === 'waiting_outside') {
              toast.info(notification.message, {
                duration: 10000,
                action: {
                  label: 'عرض',
                  onClick: () => window.location.href = '/orders'
                }
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, user]);

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead };
}

// Attendance hooks - using any type due to new tables
export function useAttendance() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_records' as any)
        .select('*')
        .order('check_in', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      toast.error('خطأ في تحميل سجلات الحضور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const checkIn = async (employeeId: string, notes?: string) => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const status = hour >= 9 ? 'late' : 'present';

      const { data, error } = await supabase
        .from('attendance_records' as any)
        .insert([{ employee_id: employeeId, notes, status }])
        .select()
        .single();

      if (error) throw error;
      setRecords(prev => [data, ...prev]);
      toast.success('تم تسجيل الحضور بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast.error('خطأ في تسجيل الحضور');
      throw error;
    }
  };

  const checkOut = async (recordId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance_records' as any)
        .update({ check_out: new Date().toISOString() })
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      setRecords(prev => prev.map(r => r.id === recordId ? data : r));
      toast.success('تم تسجيل الانصراف بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error checking out:', error);
      toast.error('خطأ في تسجيل الانصراف');
      throw error;
    }
  };

  const getEmployeeAttendance = async (employeeId: string) => {
    const { data } = await supabase
      .from('attendance_records' as any)
      .select('*')
      .eq('employee_id', employeeId)
      .order('check_in', { ascending: false });
    return data || [];
  };

  return { records, loading, fetchRecords, checkIn, checkOut, getEmployeeAttendance };
}

// Backups hooks
export function useBackups() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBackups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('database_backups' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackups(data || []);
    } catch (error: any) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const createBackup = async (name: string, tables: string[], notes?: string) => {
    try {
      const { data, error } = await supabase
        .from('database_backups' as any)
        .insert([{ 
          backup_name: name, 
          tables_included: tables, 
          notes,
          created_by: user?.id,
          backup_type: 'manual'
        }])
        .select()
        .single();

      if (error) throw error;
      setBackups(prev => [data, ...prev]);
      toast.success('تم إنشاء النسخة الاحتياطية بنجاح');
      return data;
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast.error('خطأ في إنشاء النسخة الاحتياطية');
      throw error;
    }
  };

  const deleteBackup = async (id: string) => {
    try {
      const { error } = await supabase
        .from('database_backups' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBackups(prev => prev.filter(b => b.id !== id));
      toast.success('تم حذف النسخة الاحتياطية');
    } catch (error: any) {
      console.error('Error deleting backup:', error);
      toast.error('خطأ في حذف النسخة الاحتياطية');
    }
  };

  const downloadBackup = async (id: string) => {
    const backup = backups.find(b => b.id === id);
    if (!backup) return;

    const backupData = { ...backup, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${backup.backup_name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { backups, loading, fetchBackups, createBackup, deleteBackup, downloadBackup };
}
