import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso – Inventario QR Planta Piloto" },
      {
        name: "description",
        content: "Ingresa con tu correo para consultar el inventario y registrar movimientos.",
      },
      { property: "og:title", content: "Acceso – Inventario QR Planta Piloto" },
      {
        property: "og:description",
        content: "Ingresa con tu correo para gestionar el inventario de la planta piloto.",
      },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [modo, setModo] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (!email.trim() || password.length < 6) {
      setError("Ingresa un correo válido y una contraseña de al menos 6 caracteres.");
      return;
    }
    setCargando(true);
    try {
      if (modo === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Cuenta creada. Revisa tu correo para confirmarla.");
          setModo("login");
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(
        msg.includes("Invalid login credentials")
          ? "Correo o contraseña incorrectos."
          : msg.includes("already registered")
            ? "Ese correo ya está registrado."
            : msg,
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <QrCode className="size-6" />
          </div>
          <CardTitle className="mt-2">Inventario QR – Planta Piloto</CardTitle>
          <CardDescription>
            {modo === "login" ? "Ingresa con tu correo" : "Crea tu cuenta con correo"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={enviar}>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.cl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete={modo === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={cargando}>
              {cargando ? "Procesando…" : modo === "login" ? "Ingresar" : "Crear cuenta"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setError("");
              setModo(modo === "login" ? "registro" : "login");
            }}
          >
            {modo === "login" ? "¿No tienes cuenta? Regístrate" : "Ya tengo cuenta, ingresar"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
