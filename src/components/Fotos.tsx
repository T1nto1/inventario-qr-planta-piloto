import { useQuery } from "@tanstack/react-query";
import { urlsFirmadas } from "@/lib/inventario";

export function useUrlsFotos(paths: string[]) {
  return useQuery({
    queryKey: ["fotos-url", ...paths],
    queryFn: () => urlsFirmadas(paths),
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
  });
}

export function Miniatura({ path, alt }: { path?: string | undefined; alt: string }) {
  const urls = useUrlsFotos(path ? [path] : []);
  if (!path) return null;
  const src = urls.data?.[path];
  return (
    <div className="size-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
      {src && <img src={src} alt={alt} className="size-full object-cover" loading="lazy" />}
    </div>
  );
}
