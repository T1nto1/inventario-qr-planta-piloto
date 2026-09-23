import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Rol = "admin" | "usuario" | null;

interface AuthValue {
  session: Session | null;
  user: User | null;
  rol: Rol;
  esAdmin: boolean;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  rol: null,
  esAdmin: false,
  cargando: true,
  cerrarSesion: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [rol, setRol] = useState<Rol>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nueva) => {
      setSession(nueva);
      setCargando(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setRol(null);
      return;
    }
    let cancelado = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .then(({ data }) => {
        if (cancelado) return;
        const roles = (data ?? []).map((r) => r.role);
        setRol(roles.includes("admin") ? "admin" : roles.length ? "usuario" : null);
      });
    return () => {
      cancelado = true;
    };
  }, [session?.user?.id]);

  const value: AuthValue = {
    session,
    user: session?.user ?? null,
    rol,
    esAdmin: rol === "admin",
    cargando,
    cerrarSesion: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
