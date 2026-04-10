// ─── Tipos de configuración y funciones de ayuda para el parseo ───────────────

/**
 * Define la estructura de configuración para el plugin Arch Mask.
 * Controla qué elementos visuales se muestran y qué tema se utiliza.
 */
export type Cfg = {
  enabled: boolean       // Indica si el plugin está activo
  theme: string         // El ID del tema visual a utilizar
  color_preset: "current" | "cyber" | "neon" | "overclock" // Ajustes preestablecidos de color
  set_theme: boolean    // Si debe aplicar el tema automáticamente al iniciar
  show_detected: boolean // Mostrar/ocultar la línea de entorno detectado
  show_os: boolean       // Mostrar/ocultar el nombre del sistema operativo
  show_providers: boolean // Mostrar/ocultar los proveedores de IA detectados
  show_sidebar: boolean  // Mostrar/ocultar el panel lateral personalizado
}

/**
 * Utilidad para validar y seleccionar un valor de cadena con un respaldo (fallback).
 * @param value El valor a evaluar
 * @param fallback El valor por defecto si 'value' es inválido
 */
const pick = (value: unknown, fallback: string): string => {
  if (typeof value !== "string") return fallback
  if (!value.trim()) return fallback
  return value
}

/**
 * Utilidad para validar valores booleanos con un respaldo (fallback).
 * @param value El valor a evaluar
 * @param fallback El valor por defecto si 'value' es inválido
 */
const bool = (value: unknown, fallback: boolean): boolean => {
  if (typeof value !== "boolean") return fallback
  return value
}

/**
 * Procesa las opciones proporcionadas y devuelve un objeto de configuración completo.
 * Asegura que todas las propiedades tengan valores válidos mediante el uso de fallbacks.
 * 
 * @param opts Diccionario de opciones crudas, usualmente provenientes de la configuración del plugin.
 * @returns Un objeto de tipo Cfg con valores saneados.
 */
export const cfg = (opts: Record<string, unknown> | undefined): Cfg => {
  return {
    enabled:       bool(opts?.enabled, true),
    theme:         pick(opts?.theme, "j0k3r-dev-rgl"),
    color_preset: (opts?.color_preset as any) || "current",
    set_theme:     bool(opts?.set_theme, true),
    show_detected: bool(opts?.show_detected, true),
    show_os:       bool(opts?.show_os, true),
    show_providers: bool(opts?.show_providers, true),
    show_sidebar:  bool(opts?.show_sidebar, true),
  }
}
