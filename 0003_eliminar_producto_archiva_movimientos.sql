-- Permite eliminar productos aunque tengan movimientos,
-- archivando primero esos movimientos para conservar trazabilidad.

CREATE TABLE IF NOT EXISTS public.movimientos_archivados (
  archive_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_movement_id uuid NOT NULL UNIQUE,
  product_id uuid,
  producto_codigo text,
  producto_nombre text,
  producto_categoria text,
  fecha_hora timestamptz NOT NULL,
  tipo text NOT NULL,
  cantidad numeric NOT NULL,
  cantidad_firmada numeric NOT NULL,
  stock_anterior numeric NOT NULL,
  stock_posterior numeric NOT NULL,
  usuario text,
  user_id uuid,
  observacion text,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid,
  motivo text NOT NULL DEFAULT 'PRODUCTO_ELIMINADO'
);

ALTER TABLE public.movimientos_archivados ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='movimientos_archivados'
      AND policyname='movimientos archivados lectura autenticados'
  ) THEN
    CREATE POLICY "movimientos archivados lectura autenticados"
      ON public.movimientos_archivados
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$$;

GRANT SELECT ON public.movimientos_archivados TO authenticated;
GRANT ALL ON public.movimientos_archivados TO service_role;

CREATE OR REPLACE FUNCTION public.eliminar_producto(p_product_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paths text[];
  v_uid uuid := auth.uid();
  v_prod public.productos;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT *
  INTO v_prod
  FROM public.productos
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;

  SELECT COALESCE(array_agg(storage_path), '{}')
  INTO v_paths
  FROM public.producto_fotos
  WHERE product_id = p_product_id;

  INSERT INTO public.movimientos_archivados (
    original_movement_id,
    product_id,
    producto_codigo,
    producto_nombre,
    producto_categoria,
    fecha_hora,
    tipo,
    cantidad,
    cantidad_firmada,
    stock_anterior,
    stock_posterior,
    usuario,
    user_id,
    observacion,
    archived_by,
    motivo
  )
  SELECT
    m.id,
    m.product_id,
    v_prod.codigo,
    v_prod.producto,
    v_prod.categoria,
    m.fecha_hora,
    m.tipo,
    m.cantidad,
    m.cantidad_firmada,
    m.stock_anterior,
    m.stock_posterior,
    m.usuario,
    m.user_id,
    m.observacion,
    v_uid,
    'PRODUCTO_ELIMINADO'
  FROM public.movimientos m
  WHERE m.product_id = p_product_id
  ON CONFLICT (original_movement_id) DO NOTHING;

  DELETE FROM public.movimientos
  WHERE product_id = p_product_id;

  DELETE FROM public.productos
  WHERE id = p_product_id;

  RETURN v_paths;
END;
$$;

REVOKE ALL ON FUNCTION public.eliminar_producto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_producto(uuid) TO authenticated;
