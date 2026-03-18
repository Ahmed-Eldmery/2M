import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppRole = 'owner' | 'accountant' | 'designer' | 'printer' | 'warehouse';

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  roles: AppRole[];
  created_at: string;
}

export function useUserRoles() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => r.role as AppRole),
        created_at: profile.created_at || '',
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('خطأ في تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const addRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }]);

      if (error) {
        if (error.code === '23505') {
          toast.error('هذا الدور موجود بالفعل لهذا المستخدم');
          return;
        }
        throw error;
      }

      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, roles: [...u.roles, role] }
          : u
      ));
      toast.success('تم إضافة الصلاحية بنجاح');
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast.error('خطأ في إضافة الصلاحية');
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, roles: u.roles.filter(r => r !== role) }
          : u
      ));
      toast.success('تم إزالة الصلاحية بنجاح');
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast.error('خطأ في إزالة الصلاحية');
    }
  };

  return { users, loading, fetchUsers, addRole, removeRole };
}
