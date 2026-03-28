import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FileText, 
  DollarSign, 
  UserCog, 
  Settings,
  ChevronRight,
  ChevronLeft,
  Truck,
  LogOut,
  Clock,
  Database,
  BarChart3,
  ListTodo,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile, roles, signOut, isOwner, isOwnerOrAccountant, canAccessInventory } = useAuth();

  const menuItems = [
    { path: '/', label: 'لوحة التحكم', icon: LayoutDashboard, show: true },
    { path: '/inventory', label: 'المخزن', icon: Package, show: canAccessInventory() },
    { path: '/customers', label: 'العملاء', icon: Users, show: true },
    { path: '/orders', label: 'أوامر الطباعة', icon: FileText, show: true },
    { path: '/calendar', label: 'التقويم', icon: CalendarDays, show: true },
    { path: '/tasks', label: 'المهام', icon: ListTodo, show: isOwnerOrAccountant() },
    { path: '/accounting', label: 'الحسابات', icon: DollarSign, show: isOwnerOrAccountant() },
    { path: '/reports', label: 'التقارير', icon: BarChart3, show: isOwner() },
    { path: '/employees', label: 'الموظفين', icon: UserCog, show: isOwnerOrAccountant() },
    { path: '/attendance', label: 'الحضور والانصراف', icon: Clock, show: isOwnerOrAccountant() },
    { path: '/suppliers', label: 'الموردين', icon: Truck, show: isOwner() },
    { path: '/backups', label: 'النسخ الاحتياطي', icon: Database, show: isOwner() },
    { path: '/settings', label: 'الإعدادات', icon: Settings, show: isOwner() },
  ].filter(item => item.show);

  const getRoleLabel = () => {
    if (roles.includes('owner')) return 'مالك';
    if (roles.includes('accountant')) return 'محاسب';
    if (roles.includes('designer')) return 'مصمم';
    if (roles.includes('printer')) return 'طباعة';
    if (roles.includes('warehouse')) return 'مخزن';
    return 'موظف';
  };

  return (
    <aside 
      className={`fixed top-0 right-0 h-screen bg-sidebar transition-all duration-300 z-50 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-lg">2M</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-primary">2M للدعاية</span>
          )}
        </div>
      </div>

      {/* Menu with Scroll */}
      <ScrollArea className="flex-1 px-4 py-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-3' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -left-3 top-20 w-6 h-6 bg-sidebar-primary text-sidebar-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* User Info */}
      <div className={`flex-shrink-0 p-4 border-t border-sidebar-border ${collapsed ? 'px-2' : ''}`}>
        {!collapsed ? (
          <div className="space-y-2">
            <div className="p-3 bg-sidebar-accent rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
                  <span className="text-sidebar-primary-foreground font-bold">
                    {profile?.name?.charAt(0) || 'م'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile?.name || 'مستخدم'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60">{getRoleLabel()}</p>
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 p-2 text-sm text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        ) : (
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center p-2 text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            title="تسجيل الخروج"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
