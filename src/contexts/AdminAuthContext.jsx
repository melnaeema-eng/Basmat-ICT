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
  const [permissions, setPermissions] = useState([]);
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
          await loadAdminProfile(currentSession.user.id);
        } else {
          setAdminProfile(null);
          setPermissions([]);
        }
      } catch (error) {
        console.error("خطأ في تهيئة جلسة الإدارة:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);

        if (nextSession?.user) {
          await loadAdminProfile(nextSession.user.id);
        } else {
          setAdminProfile(null);
          setPermissions([]);
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
      .select(`
        user_id,
        full_name,
        role,
        is_active
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("تعذر تحميل ملف مستخدم الإدارة:", error);
      setAdminProfile(null);
      setPermissions([]);
      return null;
    }

    setAdminProfile(data || null);

    if (data?.role) {
      const { data: permissionRows, error: permissionError } =
        await supabase
          .from("ict_admin_role_permissions")
          .select("permission_key,is_allowed")
          .eq("role", data.role)
          .eq("is_allowed", true);

      if (permissionError) {
        console.error("تعذر تحميل صلاحيات المستخدم:", permissionError);
        setPermissions([]);
      } else {
        setPermissions(
          (permissionRows || []).map((row) => row.permission_key)
        );
      }
    } else {
      setPermissions([]);
    }

    return data || null;
  }

  async function signIn(email, password) {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (error) throw error;

    const profile = await loadAdminProfile(data.user.id);

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      setSession(null);
      setAdminProfile(null);
      setPermissions([]);

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
    setPermissions([]);
  }

  async function resetPassword(email) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("اكتب البريد الإلكتروني أولًا.");
    }

    const redirectTo =
      `${window.location.origin}/admin/reset-password`;

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo }
      );

    if (error) throw error;

    return true;
  }

  async function updatePassword(password) {
    if (!password || password.length < 8) {
      throw new Error(
        "كلمة المرور يجب ألا تقل عن 8 أحرف."
      );
    }

    const { error } =
      await supabase.auth.updateUser({ password });

    if (error) throw error;

    return true;
  }

  async function reloadProfile() {
    if (!session?.user?.id) return null;
    return await loadAdminProfile(session.user.id);
  }

  const hasPermission = (permission) => {
    if (!permission) return true;

    if (adminProfile?.role === "admin") {
      return true;
    }

    return permissions.includes(permission);
  };

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      adminProfile,
      loading,
      permissions,
      isAuthenticated:
        Boolean(session?.user) &&
        Boolean(adminProfile?.is_active),
      hasPermission,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      reloadProfile,
    }),
    [session, adminProfile, loading, permissions]
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
