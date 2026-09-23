import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Printer, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Producto } from "@/lib/inventario";

export function urlProducto(codigo: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/producto/${encodeURIComponent(codigo)}`;
}

export function QrEtiqueta({
  producto,
  abierto,
  onOpenChange,
}: {
  producto: Producto;
  abierto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!abierto) return;
    QRCode.toDataURL(urlProducto(producto.codigo), { width: 512, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [abierto, producto.codigo]);

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Etiqueta QR</DialogTitle>
        </DialogHeader>

        <div id="etiqueta-print" className="rounded-lg border border-border bg-card p-4 text-center">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR ${producto.codigo}`} className="mx-auto size-48" />
          ) : (
            <div className="mx-auto flex size-48 items-center justify-center text-sm text-muted-foreground">
              Generando…
            </div>
          )}
          <p className="mt-3 text-lg font-bold tracking-wider">{producto.codigo}</p>
          <p className="text-sm font-medium">{producto.producto}</p>
          <p className="text-xs text-muted-foreground">{producto.ubicacion}</p>
        </div>

        <p className="break-all text-center text-xs text-muted-foreground">
          {urlProducto(producto.codigo)}
        </p>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimir etiqueta
          </Button>
          {dataUrl && (
            <Button variant="outline" asChild>
              <a href={dataUrl} download={`QR-${producto.codigo}.png`}>
                <Download className="size-4" />
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
