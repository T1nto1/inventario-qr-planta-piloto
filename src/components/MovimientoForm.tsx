import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { moverStock, type Movimiento, type Producto } from "@/lib/inventario";
import { cn } from "@/lib/utils";

const TIPOS = [
  { valor: "ENTRADA", label: "Entrada", icon: ArrowDownToLine },
  { valor: "SALIDA", label: "Salida", icon: ArrowUpFromLine },
  { valor: "AJUSTE", label: "Ajuste", icon: SlidersHorizontal },
] as const;

export function MovimientoForm({
  producto,
  permitirAjuste,
}: {
  producto: Producto;
  permitirAjuste?: boolean;
}) {
  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA" | "AJUSTE">("ENTRADA");
  const [cantidad, setCantidad] = useState("");
  const [observacion, setObservacion] = useState("");
  const [error, setError] = useState("");
  const [ultimo, setUltimo] = useState<Movimiento | null>(null);
  const queryClient = useQueryClient();

  const tipos = permitirAjuste ? TIPOS : TIPOS.filter((t) => t.valor !== "AJUSTE");

  const mutacion = useMutation({
    mutationFn: () =>
      moverStock({ productId: producto.id, tipo, cantidad: Number(cantidad), observacion }),
    onSuccess: (mov) => {
      setUltimo(mov);
      setCantidad("");
      setObservacion("");
      queryClient.invalidateQueries();
      toast.success(
        `${mov.tipo} registrada. Nuevo stock: ${Number(mov.stock_posterior)} ${producto.unidad}`,
      );
    },
    onError: (e: Error) => {
      setError(e.message);
      toast.error(e.message);
    },
  });

  function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    const n = Number(cantidad);
    if (!cantidad || Number.isNaN(n) || n <= 0) {
      setError("Ingresa una cantidad mayor a 0.");
      return;
    }
    if (tipo === "SALIDA" && n > Number(producto.stock_actual)) {
      setError(`Stock insuficiente: disponible ${Number(producto.stock_actual)} ${producto.unidad}.`);
      return;
    }
    if (!producto.activo) {
      setError("El producto está inactivo.");
      return;
    }
    mutacion.mutate();
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tipos.map((t) => (
          <button
            key={t.valor}
            type="button"
            onClick={() => setTipo(t.valor)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              tipo === t.valor
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="cantidad">
          {tipo === "AJUSTE" ? `Stock final (${producto.unidad})` : `Cantidad (${producto.unidad})`}
        </Label>
        <Input
          id="cantidad"
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="observacion">Observación (opcional)</Label>
        <Textarea
          id="observacion"
          rows={2}
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Orden de trabajo, responsable, destino…"
        />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {ultimo && (
        <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-foreground">
          {ultimo.tipo} de {Number(ultimo.cantidad)} {producto.unidad} registrada. Stock:{" "}
          {Number(ultimo.stock_anterior)} → <strong>{Number(ultimo.stock_posterior)}</strong>
        </div>
      )}

      <Button type="submit" size="lg" disabled={mutacion.isPending || !producto.activo}>
        {mutacion.isPending ? "Registrando…" : "Registrar movimiento"}
      </Button>
    </form>
  );
}
