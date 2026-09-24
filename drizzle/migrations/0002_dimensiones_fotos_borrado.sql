ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS diametro_interno numeric,
  ADD COLUMN IF NOT EXISTS diametro_externo numeric,
  ADD COLUMN IF NOT EXISTS largo numeric,
  ADD COLUMN IF NOT EXISTS espesor numeric,
  ADD COLUMN IF NOT EXISTS unidad_dimensional text NOT NULL DEFAULT 'mm';

ALTER TABLE public.productos
  ADD CONSTRAINT productos_dimensiones_no_negativas CHECK (
    (diametro_interno IS NULL OR diametro_interno >= 0) AND
    (diametro_externo IS NULL OR diametro_externo >= 0) AND
    (largo IS NULL OR largo >= 0) AND
    (espesor IS NULL OR espesor >= 0)
  ),
  ADD CONSTRAINT productos_unidad_dimensional_valida CHECK (unidad_dimensional IN ('mm','cm','m'));

CREATE TABLE public.producto_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX producto_fotos_product_idx ON public.producto_fotos(product_id, orden);

GRANT SELECT, INSERT, DELETE ON public.producto_fotos TO authenticated;
GRANT ALL ON public.producto_fotos TO service_role;
ALTER TABLE public.producto_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fotos lectura autenticados" ON public.producto_fotos FOR SELECT TO authenticated USING (true);
CREATE POLICY "fotos alta autenticados" ON public.producto_fotos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "fotos borrado autenticados" ON public.producto_fotos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.validar_max_fotos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.productos WHERE id = NEW.product_id FOR UPDATE;
  IF (SELECT count(*) FROM public.producto_fotos WHERE product_id = NEW.product_id) >= 3 THEN
    RAISE EXCEPTION 'Máximo 3 fotos por producto';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER producto_fotos_max3 BEFORE INSERT ON public.producto_fotos
  FOR EACH ROW EXECUTE FUNCTION public.validar_max_fotos();

CREATE OR REPLACE FUNCTION public.eliminar_producto(p_product_id uuid)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_paths text[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  PERFORM 1 FROM public.productos WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.movimientos WHERE product_id = p_product_id) THEN
    RAISE EXCEPTION 'El producto tiene movimientos registrados y no puede eliminarse; desactívalo para conservar su historial';
  END IF;
  SELECT coalesce(array_agg(storage_path), '{}') INTO v_paths FROM public.producto_fotos WHERE product_id = p_product_id;
  DELETE FROM public.productos WHERE id = p_product_id;
  RETURN v_paths;
END; $$;
REVOKE ALL ON FUNCTION public.eliminar_producto(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_producto(uuid) TO authenticated;

CREATE POLICY "producto-fotos lectura" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'producto-fotos');
CREATE POLICY "producto-fotos subida" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'producto-fotos' AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
CREATE POLICY "producto-fotos borrado" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'producto-fotos');