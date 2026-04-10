/**
 * Define la estructura de configuración para el plugin Arch Mask.
 */
export type Cfg = {
  enabled: boolean       // Indica si el plugin está activo
  theme: string          // El ID del tema visual a utilizar
  show_sidebar: boolean  // Mostrar/ocultar el panel lateral personalizado
  show_legend: boolean   // Mostrar/ocultar la línea de leyenda (línea 1)
  legend_text: string    // Texto de la leyenda (línea 1)
  show_tagline: boolean  // Mostrar/ocultar la tagline (línea 2)
  tagline_text: string   // Texto de la tagline (línea 2)
}

const pick = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") return fallback
  if (!value.trim()) return fallback
  return value
}

const bool = (value: unknown, fallback: boolean): boolean => {
  if (typeof value !== "boolean") return fallback
  return value
}

export const cfg = (opts: Record<string, unknown> | undefined): Cfg => {
  return {
    enabled:      bool(opts?.enabled, true),
    theme:        pick(opts?.theme, "j0k3r-dev-rgl"),
    show_sidebar: bool(opts?.show_sidebar, true),
    show_legend:  bool(opts?.show_legend, true),
    legend_text:  pick(opts?.legend_text, "j0k3r-dev-rgl@latest"),
    show_tagline: bool(opts?.show_tagline, true),
    tagline_text: pick(opts?.tagline_text, "arch linux · opencode"),
  }
}
