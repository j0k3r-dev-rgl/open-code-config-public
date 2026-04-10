# Arch Mask para OpenCode AI 🚀

Esta es una **máscara TUI (Terminal User Interface)** personalizada para [OpenCode AI](https://opencode.ai), diseñada con una estética inspirada en Arch Linux y optimizada para desarrolladores que buscan un entorno de terminal elegante, funcional y altamente personalizable.

El proyecto ha sido creado como una **base abierta**: siéntete libre de tomar el código, editarlo y adaptarlo a tus propios gustos. Todo el código fuente está **extensamente comentado en español** para resolver dudas sobre el funcionamiento de los temas, el arte ASCII y la integración con la API de OpenCode.

## ✨ Características

- 🎨 **Selector de Temas con Preview**: Cambia el estilo visual en tiempo real con `/mask` o `alt+m`.
- 🖼️ **Arte ASCII Dinámico**: Logo de Arch Linux que se adapta a los colores de cada tema.
- 📊 **Sidebar de Estadísticas**: Visualización reactiva de tokens, uso de contexto y costes de sesión.
- ☁️ **Transparencia Real**: Configurado para respetar el fondo y la opacidad de tu terminal.
- 📂 **Gestión de Plugins**: Configura automáticamente la barra lateral nativa de OpenCode.

## 🛠️ Instalación

Existen dos formas principales de instalar y utilizar esta máscara en tu instancia de OpenCode:

### Opción 1: Instalación vía NPM (Recomendado para usuarios)

Si el paquete está publicado en el registro de NPM, puedes agregarlo directamente a tu configuración global:

1. Instala el plugin globalmente:
   ```bash
   opencode plugin nombre-del-paquete -g
   ```
2. OpenCode actualizará automáticamente tu archivo `~/.config/opencode/tui.json`.

### Opción 2: Instalación Local (Modo Desarrollador)

Si prefieres tener el código en tu PC para editarlo o probarlo localmente, sigue estos pasos:

1. Clona o descarga este repositorio en una carpeta de tu preferencia.
2. Entra en la carpeta y asegúrate de instalar las dependencias:
   ```bash
   npm install
   ```
3. Abre tu archivo de configuración de OpenCode (`~/.config/opencode/tui.json`) y apunta el plugin directamente a la ruta de tu carpeta:

   ```json
   {
     "plugin": [
       [
         "/home/tu-usuario/ruta/a/opencode-mask",
         {
           "enabled": true,
           "theme": "tokyo-night-dev",
           "set_theme": true,
           "show_sidebar": true
         }
       ]
     ]
   }
   ```

## ⌨️ Atajos y Comandos

Tanto los comandos de barra diagonal (`/`) como los atajos de teclado (`alt`) están completamente operativos en la interfaz (Home y Chat).

- **/mask** o **alt+m**: Abre el selector de temas para personalizar el estilo visual.
- **/profiles** o **alt+p**: Abre el gestor de perfiles de agentes.
- **/lazygit** o **alt+g**: Abre la interfaz interactiva de Git (requiere tener `lazygit` instalado en tu sistema).
- **/restore**: Desinstala el plugin de tu configuración local y cierra OpenCode para restaurar la interfaz original.

## 🗂️ Gestión de Perfiles de Agentes

Accesible con `alt+p` o `/profiles`. Permite organizar las configuraciones de modelos de tus agentes en perfiles separados, ideal para cambiar entre distintos setups de trabajo.

### Tipos de perfiles

- **General** — agrupa agentes cuyo nombre **no** empieza por `sdd-` (agentes de propósito general).
- **SDD** — agrupa agentes cuyo nombre **empieza** por `sdd-` (agentes del flujo Spec-Driven Development).

### Funcionalidades

- **Crear perfil**: solicita un nombre y luego el tipo (General o SDD). El perfil se crea a partir de tu `opencode.json` actual con el campo `_profileType` para identificar su tipo.
- **Asignar perfil General / Asignar perfil SDD**: muestra solo los perfiles del tipo correspondiente. Al seleccionar uno se abre el detalle del perfil.
- **Detalle del perfil**: vista de solo lectura con el nombre editable (✏), la lista de agentes filtrada por tipo con su modelo actual y el tamaño de contexto, y tres acciones:
  - **✎ Editar agentes** — permite cambiar el modelo de cada agente uno a uno. La selección de modelo se hace en dos pasos: primero el proveedor y luego el modelo, con el contexto visible (ej. `claude-sonnet-4-6 (200K)`). El cursor vuelve al último agente editado.
  - **✓ Asignar perfil** — escribe el perfil en `opencode.json` y muestra un aviso para reiniciar OpenCode.
  - **← Volver** — regresa a la lista de perfiles.

### Rutas de almacenamiento

Los perfiles se guardan en `~/.config/opencode/profiles/` como archivos `.json` independientes. OpenCode usa XDG Base Directories en todas las plataformas (Linux, macOS y Windows), por lo que la ruta siempre se resuelve a partir de `XDG_CONFIG_HOME` o `~/.config`.

### 🔄 Cómo desinstalar (Restaurar OpenCode)

Si deseas dejar de usar esta máscara y volver a la interfaz original de OpenCode, no necesitas editar archivos manualmente:

1. Escribe `/restore` en cualquier pantalla (Home o Chat).
2. Confirma la acción en el diálogo que aparecerá.
3. El plugin se eliminará automáticamente de tu archivo `tui.json` y OpenCode se cerrará para aplicar los cambios.

Al volver a abrir OpenCode, estarás en la interfaz por defecto.

> **Nota**: Los atajos de teclado `alt` te permiten una navegación más fluida sin interferir con combinaciones reservadas del sistema, mientras que los comandos `/` son ideales para un acceso rápido por comandos.

## 🤝 Contribuciones y Personalización

Este repositorio es una base educativa. Si quieres crear tu propio tema:
1. Añade un nuevo archivo `.json` en la carpeta `themes/` (usa `j0k3r-dev-rgl.json` como plantilla).
2. Regístralo en el bloque de instalación de `tui.tsx`.
3. ¡Disfruta de tu nueva interfaz!

## 📜 Créditos y Agradecimientos

Este proyecto fue creado el **4 de abril de 2026** tomando como base e inspiración el excelente trabajo de **IrrealV** en su plugin:
👉 [IrrealV/plugin-gentleman](https://github.com/IrrealV/plugin-gentleman)

¡Muchas gracias por compartir tu conocimiento con la comunidad!

---
Desarrollado con ❤️ por **j0k3r**

> **"El código es poesía, y el Open Source es nuestra forma de compartirla con el mundo. ¡VIVA EL OPEN SOURCE!"** 🐧✨
