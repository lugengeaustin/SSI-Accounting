import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  getProfile,
  getCurrencies,
  getAccounts,
  getProjects,
  getFxMap,
  type Profile,
  type Currency,
  type Account,
  type Project,
} from "./api";

type Ref = {
  currencies: Currency[];
  accounts: Account[];
  projects: Project[];
  fx: Record<string, number>;
};

type Ctx = {
  session: Session | null;
  profile: Profile | null;
  ref: Ref;
  loading: boolean;
  refreshRef: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const emptyRef: Ref = { currencies: [], accounts: [], projects: [], fx: { TZS: 1 } };
const AuthCtx = createContext<Ctx>(undefined as unknown as Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ref, setRef] = useState<Ref>(emptyRef);
  const [loading, setLoading] = useState(true);

  async function loadAll(s: Session) {
    try {
      const [p, currencies, accounts, projects, fx] = await Promise.all([
        getProfile(s.user.id).catch(() => null),
        getCurrencies(),
        getAccounts(),
        getProjects(),
        getFxMap(),
      ]);
      setProfile(p);
      setRef({ currencies, accounts, projects, fx });
    } catch (e) {
      console.error("Failed to load reference data", e);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadAll(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) await loadAll(s);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };
  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    if (!data.session) {
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
      if (e2) throw e2;
    }
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };
  const refreshRef = async () => {
    if (session) await loadAll(session);
  };

  return (
    <AuthCtx.Provider value={{ session, profile, ref, loading, refreshRef, signIn, signUp, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
