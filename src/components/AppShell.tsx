import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Boxes, ArrowLeftRight, QrCode, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventario", label: "Inventario", icon: Boxes },
  { to: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { to: "/escanear", label: "Escanear QR", icon: QrCode },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, rol, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function salir() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await cerrarSesion();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <QrCode className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-lg">
              Inventario QR – Planta Piloto
            </h1>
            <p className="truncate text-xs text-primary-foreground/70">
              {user?.email ?? ""}
              {rol ? ` · ${rol === "admin" ? "Administrador" : "Usuario"}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={salir}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
        <nav className="mx-auto hidden w-full max-w-6xl gap-1 px-2 pb-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-t-md px-3 py-2 text-sm font-medium text-primary-foreground/70 transition-colors hover:text-primary-foreground"
              activeProps={{
                className:
                  "rounded-t-md px-3 py-2 text-sm font-medium border-b-2 border-accent text-primary-foreground",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card sm:hidden">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground"
            activeProps={{ className: "flex flex-col items-center gap-1 py-2 text-[11px] text-primary font-semibold" }}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
