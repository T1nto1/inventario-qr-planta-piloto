-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','usuario');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfiles visibles para autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver roles propios" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Nuevo usuario: perfil + rol (primer usuario es admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    v_role := 'admin';
  ELSE
    v_role := 'usuario';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Productos
CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  producto text NOT NULL,
  categoria text NOT NULL DEFAULT '',
  descripcion text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'un',
  ubicacion text NOT NULL DEFAULT '',
  stock_actual numeric NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo numeric NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.productos TO authenticated;
GRANT ALL ON public.productos TO service_role;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "productos lectura autenticados" ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "productos alta admin" ON public.productos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "productos edicion admin" ON public.productos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

CREATE TRIGGER productos_updated_at BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Movimientos (inmutables)
CREATE TABLE public.movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL CHECK (tipo IN ('ENTRADA','SALIDA','AJUSTE')),
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  cantidad_firmada numeric NOT NULL,
  stock_anterior numeric NOT NULL,
  stock_posterior numeric NOT NULL,
  usuario text NOT NULL DEFAULT '',
  user_id uuid,
  observacion text NOT NULL DEFAULT ''
);
CREATE INDEX movimientos_product_idx ON public.movimientos(product_id, fecha_hora DESC);
GRANT SELECT ON public.movimientos TO authenticated;
GRANT ALL ON public.movimientos TO service_role;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movimientos lectura autenticados" ON public.movimientos FOR SELECT TO authenticated USING (true);

-- RPC transaccional con bloqueo de fila
CREATE OR REPLACE FUNCTION public.mover_stock(
  p_product_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_observacion text DEFAULT ''
)
RETURNS public.movimientos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prod public.productos;
  v_uid uuid := auth.uid();
  v_email text;
  v_firmada numeric;
  v_nuevo numeric;
  v_mov public.movimientos;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_tipo NOT IN ('ENTRADA','SALIDA','AJUSTE') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a 0'; END IF;

  SELECT * INTO v_prod FROM public.productos WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado'; END IF;
  IF NOT v_prod.activo THEN RAISE EXCEPTION 'El producto está inactivo'; END IF;

  IF p_tipo = 'ENTRADA' THEN
    v_firmada := p_cantidad;
    v_nuevo := v_prod.stock_actual + p_cantidad;
  ELSIF p_tipo = 'SALIDA' THEN
    IF p_cantidad > v_prod.stock_actual THEN
      RAISE EXCEPTION 'Stock insuficiente: disponible %', v_prod.stock_actual;
    END IF;
    v_firmada := -p_cantidad;
    v_nuevo := v_prod.stock_actual - p_cantidad;
  ELSE
    v_firmada := p_cantidad - v_prod.stock_actual;
    v_nuevo := p_cantidad;
  END IF;

  IF v_nuevo < 0 THEN RAISE EXCEPTION 'El stock no puede ser negativo'; END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_uid;

  UPDATE public.productos SET stock_actual = v_nuevo WHERE id = p_product_id;

  INSERT INTO public.movimientos (product_id, tipo, cantidad, cantidad_firmada, stock_anterior, stock_posterior, usuario, user_id, observacion)
  VALUES (p_product_id, p_tipo, CASE WHEN p_tipo='AJUSTE' THEN GREATEST(abs(v_firmada),0.000001) ELSE p_cantidad END, v_firmada, v_prod.stock_actual, v_nuevo, coalesce(v_email,''), v_uid, coalesce(p_observacion,''))
  RETURNING * INTO v_mov;

  RETURN v_mov;
END;
$$;

REVOKE ALL ON FUNCTION public.mover_stock(uuid, text, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.mover_stock(uuid, text, numeric, text) TO authenticated;

-- Datos de demostración
INSERT INTO public.productos (codigo, producto, categoria, descripcion, unidad, ubicacion, stock_actual, stock_minimo) VALUES
('PER-001','Perno M10 x 50 mm','Pernos y fijaciones','Perno hexagonal acero galvanizado','un','Bodega 3 / Estante A2',100,30),
('EMP-001','Empaquetadura 2" 150#','Empaquetaduras','Empaquetadura para brida 2 pulgadas clase 150','un','Bodega 3 / Estante C1',20,8),
('VAL-001','Válvula bola 1/2"','Válvulas','Válvula de bola bronce 1/2 pulgada','un','Bodega 2 / Estante B1',12,5),
('INS-001','Termocupla tipo K','Instrumentación','Termocupla tipo K con vaina inoxidable','un','Gabinete Instrumentación',8,3),
('MAN-001','Manguera aire 8 mm','Mangueras y conexiones','Manguera neumática poliuretano 8 mm','m','Bodega 2 / Estante D2',30,10);