import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          await loadAdminProfile(
            currentSession.user.id
          );
        } else {
          setAdminProfile(null);
        }
      } catch (error) {
        console.error(
          "خطأ في تهيئة جلسة الإدارة:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);

        if (nextSession?.user) {
          await loadAdminProfile(
            nextSession.user.id
          );
        } else {
          setAdminProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadAdminProfile(userId) {
    const { data, error } = await supabase
      .from("ict_admin_users")
      .select(
        `
          user_id,
          full_name,
          role,
          is_active
        `
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "تعذر تحميل ملف مستخدم الإدارة:",
        error
      );

      setAdminProfile(null);
      return null;
    }

    setAdminProfile(data || null);

    return data || null;
  }

  async function signIn(email, password) {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      throw error;
    }

    const profile = await loadAdminProfile(
      data.user.id
    );

    if (!profile?.is_active) {
      await supabase.auth.signOut();

      throw new Error(
        "هذا الحساب غير مخول للدخول إلى لوحة الإدارة."
      );
    }

    setSession(data.session);

    return profile;
  }

  async function signOut() {
    await supabase.auth.signOut();

    setSession(null);
    setAdminProfile(null);
  }

  async function resetPassword(email) {
    const redirectTo = `${window.location.origin}/admin/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    if (error) {
      throw error;
    }
  }

  async function updatePassword(password) {
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      throw error;
    }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      adminProfile,
      loading,
      isAuthenticated:
        Boolean(session?.user) &&
        Boolean(adminProfile?.is_active),
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [session, adminProfile, loading]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error(
      "useAdminAuth must be used inside AdminAuthProvider."
    );
  }

  return context;
}
