import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data: { session: currentSession } } =
        await supabase.auth.getSession();

      if (!mounted) return;

      setSession(currentSession);

      if (currentSession?.user) {
        await ensureAndLoad(currentSession.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) setLoading(false);
    }

    initialize();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        setSession(nextSession);

        if (nextSession?.user) {
          await ensureAndLoad(nextSession.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("ict_customer_portal_users")
      .select(`
        user_id,
        customer_id,
        full_name,
        email,
        is_active,
        customer:ict_customers(id,name,company_name,email,phone)
      `)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setProfile(null);
      return null;
    }

    setProfile(data || null);
    return data || null;
  }

  async function ensureAndLoad(userId) {
    const { error } = await supabase.rpc("ensure_customer_portal_profile");

    if (error) {
      setProfile(null);
      return null;
    }

    return await loadProfile(userId);
  }

  async function signIn(email, password) {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

    if (error) {
      if (error.message?.toLowerCase().includes("invalid login")) {
        throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      }
      throw error;
    }

    const customerProfile = await ensureAndLoad(data.user.id);

    if (!customerProfile?.is_active) {
      await supabase.auth.signOut();
      throw new Error("تعذر تفعيل ملف العميل. يرجى التواصل مع خدمة العملاء.");
    }

    setSession(data.session);
    return customerProfile;
  }

  async function signUp({ email, password, metadata = {} }) {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          portal_customer: true,
          ...metadata,
        },
      },
    });

    if (error) {
      const lower = error.message?.toLowerCase() || "";
      if (
        lower.includes("already registered") ||
        lower.includes("already exists") ||
        lower.includes("user already")
      ) {
        throw new Error(
          "هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور."
        );
      }
      throw error;
    }

    // Supabase may intentionally return an obfuscated existing-user response.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error(
        "هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور."
      );
    }

    return data;
  }

  async function resetPassword(email) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("اكتب البريد الإلكتروني أولًا.");
    }

    const redirectUrl =
    "https://ict.basmat-alnawabig.com.sa/portal/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: redirectUrl }
    );

    if (error) throw error;
    return true;
  }

  async function updatePassword(password) {
    if (!password || password.length < 8) {
      throw new Error("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    return true;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      loading,
      isAuthenticated:
        Boolean(session?.user) && Boolean(profile?.is_active),
      signIn,
      signUp,
      resetPassword,
      updatePassword,
      signOut,
      reloadProfile: async () => {
        if (session?.user?.id) {
          return await ensureAndLoad(session.user.id);
        }
        return null;
      },
    }),
    [session, profile, loading]
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("CustomerAuthProvider is required.");
  }
  return context;
}
