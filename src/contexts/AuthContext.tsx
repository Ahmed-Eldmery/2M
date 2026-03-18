import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'owner' | 'accountant' | 'designer' | 'printer' | 'warehouse';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  ownerExists: boolean | null;
  checkOwnerExists: () => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isOwner: () => boolean;
  isOwnerOrAccountant: () => boolean;
  canAccessInventory: () => boolean;
  canAccessOrders: () => boolean;
  canAccessAccounting: () => boolean;
  canAccessEmployees: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerExists, setOwnerExists] = useState<boolean | null>(null);

  const checkOwnerExists = async (): Promise<boolean> => {
    try {
      // First check system_settings for setup completion
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'owner_setup_complete')
        .maybeSingle();

      if (settingsData?.value === true) {
        setOwnerExists(true);
        return true;
      }

      // If no setting, check if any owner role exists
      const { data: rolesData, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'owner')
        .limit(1);

      if (error) {
        console.error('Error checking owner exists:', error);
        // Default to false if we can't check
        setOwnerExists(false);
        return false;
      }

      const exists = rolesData && rolesData.length > 0;
      setOwnerExists(exists);
      return exists;
    } catch (error) {
      console.error('Error in checkOwnerExists:', error);
      setOwnerExists(false);
      return false;
    }
  };

  useEffect(() => {
    // Check if owner exists first
    checkOwnerExists();

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile/roles fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfileAndRoles(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfileAndRoles(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfileAndRoles = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData) {
        setRoles(rolesData.map(r => r.role as AppRole));
      }
    } catch (error) {
      console.error('Error fetching profile/roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const isOwner = () => hasRole('owner');
  const isOwnerOrAccountant = () => hasRole('owner') || hasRole('accountant');
  const canAccessInventory = () => isOwner() || hasRole('warehouse');
  const canAccessOrders = () => true; // All authenticated users can view orders
  const canAccessAccounting = () => isOwnerOrAccountant();
  const canAccessEmployees = () => isOwnerOrAccountant();

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      loading,
      ownerExists,
      checkOwnerExists,
      signIn,
      signUp,
      signOut,
      hasRole,
      isOwner,
      isOwnerOrAccountant,
      canAccessInventory,
      canAccessOrders,
      canAccessAccounting,
      canAccessEmployees,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
