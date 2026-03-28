import { useState } from 'react';
import { Building2, Users, Shield, Bell, Palette, Database, Plus, X, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { useUserRoles, AppRole } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const roleLabels: Record<AppRole, string> = {
  owner: 'مالك',
  accountant: 'محاسب',
  designer: 'مصمم',
  printer: 'طباعة',
  warehouse: 'مخزن',
};

const roleColors: Record<AppRole, string> = {
  owner: 'bg-primary/10 text-primary',
  accountant: 'bg-success/10 text-success',
  designer: 'bg-secondary/10 text-secondary',
  printer: 'bg-accent/10 text-accent',
  warehouse: 'bg-warning/10 text-warning',
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const { users, loading, addRole, removeRole } = useUserRoles();

  const tabs = [
    { id: 'company', label: 'بيانات الشركة', icon: Building2 },
    { id: 'users', label: 'المستخدمين', icon: Users },
    { id: 'permissions', label: 'الصلاحيات', icon: Shield },
    { id: 'notifications', label: 'الإشعارات', icon: Bell },
    { id: 'appearance', label: 'المظهر', icon: Palette },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: Database },
    { id: 'reset', label: 'تهيئة النظام', icon: AlertTriangle },
  ];

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) return;
    await addRole(selectedUser, selectedRole);
    setSelectedUser(null);
    setSelectedRole('');
  };

  const handleResetSystem = async () => {
    if (resetConfirmation !== 'RESET') return;
    
    setIsResetting(true);
    try {
      const tablesToDelete = [
        'activity_logs',
        'notifications',
        'order_inventory_items',
        'order_items',
        'transactions',
        'salary_records',
        'tasks',
        'inventory_receipt_items',
        'inventory_receipts',
        'print_orders',
        'inventory',
        'supplier_items',
        'suppliers',
        'customers',
        'employees'
      ];

      for (const table of tablesToDelete) {
        const { error } = await supabase
          .from(table as any)
          .delete()
          .not('id', 'is', null);
        
        if (error) {
          console.error(`Error deleting from ${table}:`, error);
          throw new Error(`تعذر مسح البيانات من جدول ${table}`);
        }
      }

      toast.success('تمت إعادة تهيئة النظام بنجاح. جميع البيانات محذوفة الآن.');
      setResetConfirmation('');
      
      // Reload the page to clear caches/state
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      console.error('Reset system error:', error);
      toast.error('حدث خطأ أثناء محاولة مسح البيانات: ' + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة إعدادات النظام والتخصيص</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="glass-card p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 glass-card p-6">
          {activeTab === 'company' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">بيانات الشركة</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">اسم المكتب</label>
                  <input type="text" defaultValue="2M للدعاية والإعلان" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">رقم الهاتف</label>
                  <input type="text" defaultValue="01000000000" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">البريد الإلكتروني</label>
                  <input type="email" defaultValue="info@2m-ads.com" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">الرقم الضريبي</label>
                  <input type="text" className="input-field" placeholder="الرقم الضريبي" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">العنوان</label>
                  <textarea className="input-field min-h-[100px]" placeholder="العنوان التفصيلي"></textarea>
                </div>
              </div>
              <button className="btn-primary">حفظ التغييرات</button>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">إدارة المستخدمين والصلاحيات</h2>
              <p className="text-muted-foreground">إضافة وإزالة صلاحيات المستخدمين المسجلين</p>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <span 
                              key={role}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${roleColors[role]}`}
                            >
                              {roleLabels[role]}
                              <button 
                                onClick={() => removeRole(user.id, role)}
                                className="w-4 h-4 rounded-full hover:bg-destructive/20 flex items-center justify-center"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">لا توجد صلاحيات</span>
                        )}
                      </div>

                      {selectedUser === user.id ? (
                        <div className="flex items-center gap-2">
                          <select 
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                            className="input-field flex-1"
                          >
                            <option value="">اختر صلاحية</option>
                            {(Object.keys(roleLabels) as AppRole[])
                              .filter(role => !user.roles.includes(role))
                              .map(role => (
                                <option key={role} value={role}>{roleLabels[role]}</option>
                              ))
                            }
                          </select>
                          <button 
                            onClick={handleAddRole}
                            disabled={!selectedRole}
                            className="btn-primary py-2"
                          >
                            إضافة
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedUser(null);
                              setSelectedRole('');
                            }}
                            className="btn-outline py-2"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setSelectedUser(user.id)}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          إضافة صلاحية
                        </button>
                      )}
                    </div>
                  ))}

                  {users.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">لا يوجد مستخدمين مسجلين</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-foreground">نظام الصلاحيات</h2>
              <p className="text-muted-foreground">شرح صلاحيات كل دور في النظام</p>
              
              <div className="space-y-4">
                {[
                  { role: 'owner' as AppRole, desc: 'صلاحيات كاملة على جميع الأقسام - الإعدادات، الموردين، الموظفين، الحسابات' },
                  { role: 'accountant' as AppRole, desc: 'الحسابات المالية والتقارير، الموظفين، العملاء' },
                  { role: 'designer' as AppRole, desc: 'عرض وتحديث أوامر التصميم فقط' },
                  { role: 'printer' as AppRole, desc: 'عرض وتحديث أوامر الطباعة، تنبيهات العميل بالخارج' },
                  { role: 'warehouse' as AppRole, desc: 'إدارة المخزن - إضافة وصرف الخامات' },
                ].map((item) => (
                  <div key={item.role} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColors[item.role]}`}>
                        {roleLabels[item.role]}
                      </span>
                      <span className="text-muted-foreground">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-destructive mb-6">
                <AlertTriangle className="w-8 h-8" />
                <h2 className="text-xl font-bold">إعادة تهيئة النظام بالكامل</h2>
              </div>
              
              <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-lg space-y-4">
                <p className="text-destructive font-semibold text-lg">تحذير خطير جداً!</p>
                <p className="text-foreground">
                  أنت على وشك مسح <span className="font-bold">جميع البيانات</span> في النظام. سيتم حذف جميع العملاء، الطلبات، الإيصالات، الحسابات، والمخزون بشكل نهائي ولا يمكن التراجع عن هذه الخطوة.
                </p>
                <p className="text-muted-foreground text-sm">
                  ملاحظة: سيتم الاحتفاظ بحسابات المستخدمين وصلاحياتهم فقط للتمكن من تسجيل الدخول لاحقاً.
                </p>

                <div className="pt-4 border-t border-destructive/20">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    لتأكيد المسح، يرجى كتابة كلمة <span className="font-mono bg-muted px-2 py-1 rounded mx-1">RESET</span> بالإنجليزية في الحقل أدناه:
                  </label>
                  <input 
                    type="text" 
                    value={resetConfirmation}
                    onChange={(e) => setResetConfirmation(e.target.value)}
                    placeholder="اكتب كلمة RESET لتأكيد المسح"
                    className="input-field border-destructive focus:border-destructive mb-4" 
                    dir="ltr"
                  />
                  
                  <button 
                    onClick={handleResetSystem}
                    disabled={resetConfirmation !== 'RESET' || isResetting}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-destructive hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-destructive disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2"
                  >
                    {isResetting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                    {isResetting ? 'جاري مسح النظام...' : 'تأكيد المسح النهائي'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'company' && activeTab !== 'users' && activeTab !== 'permissions' && activeTab !== 'reset' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                {tabs.find(t => t.id === activeTab)?.icon && (
                  <div className="w-8 h-8 text-muted-foreground">
                    {(() => {
                      const Icon = tabs.find(t => t.id === activeTab)?.icon;
                      return Icon ? <Icon /> : null;
                    })()}
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">قريباً...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
