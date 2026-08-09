import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(currentSession);

      if (currentSession?.user) {
        await loadProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) setLoading(false);
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession);
        if (nextSession?.user) {
          await loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from("ict_customer_portal_users")
      .select(`
        user_id, customer_id, full_name, email, is_active,
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

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const customerProfile = await loadProfile(data.user.id);

    if (!customerProfile?.is_active) {
      await supabase.auth.signOut();
      throw new Error("هذا الحساب غير مفعل لبوابة العملاء.");
    }

    setSession(data.session);
    return customerProfile;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    loading,
    isAuthenticated: Boolean(session?.user) && Boolean(profile?.is_active),
    signIn,
    signOut,
  }), [session, profile, loading]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error("CustomerAuthProvider is required.");
  return context;
}
