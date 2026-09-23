import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/escanear")({
  head: () => ({
    meta: [
      { title: "Escanear QR – Inventario Planta Piloto" },
      { name: "description", content: "Escanea el código QR de un producto o búscalo por código." },
      { property: "og:title", content: "Escanear QR – Inventario Planta Piloto" },
      {
        property: "og:description",
        content: "Escanea el código QR de un producto o búscalo por código.",
      },
    ],
  }),
  component: Escanear,
});

const ELEMENT_ID = "lector-qr";

function Escanear() {
  const navigate = useNavigate();
  const [activo, setActivo] = useState(false);
  const [error, setError] = useState("");
  const [codigo, setCodigo] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, []);

  function irA(valor: string) {
    let cod = valor.trim();
    if (!cod) return;
    if (cod.startsWith("http")) {
      try {
        const partes = new URL(cod).pathname.split("/");
        cod = decodeURIComponent(partes[partes.length - 1] ?? "");
      } catch {
        /* usar valor tal cual */
      }
    }
    if (!cod) return;
    scannerRef.current?.stop().catch(() => {});
    navigate({ to: "/producto/$codigo", params: { codigo: cod.toUpperCase() } });
  }

  async function iniciar() {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(ELEMENT_ID);
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void };
      setActivo(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (texto) => irA(texto),
        () => {},
      );
    } catch {
      setActivo(false);
      setError(
        "No se pudo acceder a la cámara. Revisa los permisos del navegador o usa la búsqueda manual.",
      );
    }
  }

  async function detener() {
    try {
      await scannerRef.current?.stop();
    } catch {
      /* ignorar */
    }
    scannerRef.current = null;
    setActivo(false);
  }

  return (
    <div className="grid gap-5">
      <h2 className="text-xl font-semibold">Escanear QR</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cámara</CardTitle>
          <CardDescription>
            Apunta la cámara al código QR de la etiqueta para abrir la ficha del producto.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div
            id={ELEMENT_ID}
            className="mx-auto w-full max-w-sm overflow-hidden rounded-md border border-border bg-muted"
            style={{ minHeight: activo ? 260 : 0 }}
          />
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {activo ? (
            <Button variant="outline" onClick={detener}>
              <CameraOff className="size-4" /> Detener cámara
            </Button>
          ) : (
            <Button onClick={iniciar}>
              <Camera className="size-4" /> Activar cámara
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Búsqueda manual</CardTitle>
          <CardDescription>Escribe el código impreso en la etiqueta (ej. PER-001).</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              irA(codigo);
            }}
          >
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="PER-001"
              className="uppercase"
            />
            <Button type="submit">
              <Search className="size-4" /> Buscar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
