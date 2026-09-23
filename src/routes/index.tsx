import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { QrCode, ScanLine, Boxes, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inventario QR – Planta Piloto" },
      {
        name: "description",
        content:
          "Inventario compartido en la nube con códigos QR: consulta stock, registra entradas y salidas desde el celular.",
      },
      { property: "og:title", content: "Inventario QR – Planta Piloto" },
      {
        property: "og:description",
        content: "Inventario compartido con QR, entradas y salidas trazables desde el celular.",
      },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { session, cargando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!cargando && session) navigate({ to: "/dashboard", replace: true });
  }, [cargando, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-primary px-4 py-4 text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <QrCode className="size-5" />
          </div>
          <h1 className="text-base font-semibold sm:text-lg">Inventario QR – Planta Piloto</h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Control de bodega
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          Inventario compartido, trazable y siempre al día
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Escanea el QR de cada producto con la cámara del celular y registra entradas o salidas en
          segundos. Todo el equipo trabaja sobre el mismo stock en la nube.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/auth">Ingresar / Crear cuenta</Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ScanLine, t: "Escaneo QR", d: "Cada producto tiene su etiqueta imprimible." },
            { icon: Boxes, t: "Stock en vivo", d: "Estados OK, REPOSICIÓN y SIN STOCK." },
            { icon: ShieldCheck, t: "Sin stock negativo", d: "Movimientos validados y auditables." },
          ].map((c) => (
            <div key={c.t} className="rounded-lg border border-border bg-card p-4">
              <c.icon className="size-5 text-primary" />
              <p className="mt-2 font-semibold">{c.t}</p>
              <p className="text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
