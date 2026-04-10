// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { HomeLogo, SidebarArch } from "./components";
import { cfg } from "./config";
import {
	getArts,
	addArt,
	updateArt,
	deleteArt,
	getActiveArt,
	getActiveId,
	setActiveId,
	readTxt,
	getStoreDir,
} from "./ascii-store";

const id = "j0k3r-dev-rgl";

const rec = (value: unknown) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	return Object.fromEntries(Object.entries(value));
};

// ─── Colores disponibles ─────────────────────────────────────────────────────
const PRESET_COLORS = [
	{ label: "Cyan (Arch)",  hex: "#00c8ff" },
	{ label: "Hot Pink",     hex: "#ff2d78" },
	{ label: "Purple",       hex: "#9d4edd" },
	{ label: "Green Neon",   hex: "#39ff14" },
	{ label: "Orange",       hex: "#ff8800" },
	{ label: "Yellow",       hex: "#f0e040" },
	{ label: "White",        hex: "#e0e0e0" },
	{ label: "Red",          hex: "#ff4444" },
];

const tui: TuiPlugin = async (api, options) => {
	const baseOpts = rec(options) ?? {};
	if (!cfg(baseOpts).enabled) return;

	const getState = () => {
		const kvOverrides = rec(api.kv.get("mask_config")) ?? {};
		return cfg({ ...baseOpts, ...kvOverrides });
	};

	// Arte activo en KV — el slot lo lee en cada render, igual que mask_config.
	// Cuando cambia, OpenTUI re-renderiza home_logo automáticamente.
	const getActiveArtKV = () => {
		return api.kv.get<any>("active_art") ?? null;
	};

	const setActiveArtKV = (art: any | null) => {
		api.kv.set("active_art", art);
		// También persistimos en filesystem para consistencia
		if (art) {
			setActiveId(art.id);
		} else {
			setActiveId(null);
		}
	};

	const saveConfig = (patch: Record<string, unknown>) => {
		const current = rec(api.kv.get("mask_config")) ?? {};
		api.kv.set("mask_config", { ...current, ...patch });
	};

	// bumpVer ya no necesita trucos — KV es el trigger real
	const bumpVer = () => {};

	const resolveTheme = (name: string) =>
		new URL(`./themes/${name}.json`, import.meta.url).pathname;

	// ─── Instalación de Temas ────────────────────────────────────────────────
	try {
		await api.theme.install(resolveTheme("j0k3r-dev-rgl"));
		await api.theme.install(resolveTheme("arch-cyber"));
		await api.theme.install(resolveTheme("arch-neon"));
		await api.theme.install(resolveTheme("arch-overclock"));
		await api.theme.install(resolveTheme("mask-cyber"));
		await api.theme.install(resolveTheme("tokyo-night-dev"));
		await api.theme.install(resolveTheme("arch-electric"));
		await api.theme.install(resolveTheme("j0k3r-neon"));
	} catch (e) {
		console.error("Fallo al instalar temas", e);
	}

	// ─── Carga del Tema Persistente ──────────────────────────────────────────
	const storedTheme = api.kv.get<string>("selected_theme");
	if (storedTheme) {
		try { api.theme.set(storedTheme); } catch (e) {}
	}

	// ─── Sincronizar arte activo a KV al arrancar ─────────────────────────────
	// Si KV no tiene el arte activo (primera carga), lo leemos del filesystem.
	if (!api.kv.get("active_art")) {
		const fsArt = getActiveArt();
		if (fsArt) api.kv.set("active_art", fsArt);
	}

	// ─── Slots ───────────────────────────────────────────────────────────────
	api.slots.register({
		slots: {
			home_logo(ctx) {
				const s = getState();
				const art = getActiveArtKV();  // lee de KV — re-renderiza automáticamente al cambiar
				return <HomeLogo theme={ctx.theme.current} config={s} activeArt={art} />;
			},
			sidebar_content(ctx, value) {
				const s = getState();
				const sessionID = value?.session_id;
				return (
					<SidebarArch
						theme={ctx.theme.current}
						selectedTheme={api.theme.selected}
						config={s}
						branch={api.state.vcs?.branch}
						getMessages={() =>
							sessionID ? api.state.session.messages(sessionID) : []
						}
						contextLimit={1000000}
					/>
				);
			},
			home_prompt() { return null; },
			home_footer() { return null; },
			session_prompt_right(ctx, value) {
				const t = ctx.theme.current;
				return (
					<text fg={t.textMuted}>
						<span style={{ fg: "#ff2d78" }}>j0k3r</span>
						<span style={{ fg: "#9d4edd" }}>@</span>
						{(value.session_id ?? "").slice(0, 6)}
					</text>
				);
			},
		},
	});

	// ─── Comandos ────────────────────────────────────────────────────────────
	api.command.register(() => [
		{
			title: "Arch Mask: Configuración",
			value: "mask",
			description: "Cambiar tema, textos, ASCII art y visibilidad",
			keybind: "alt+m",
			slash: { name: "mask" },
			onSelect: () => showMainMenu(),
		},
	]);

	// ─── Helpers de preview ──────────────────────────────────────────────────
	// Renderiza las primeras N líneas del arte con un color dado como footer JSX
	const renderPreview = (lines: string[], colors: string[]) => {
		const preview = lines.slice(0, 12);
		return (
			<box flexDirection="column" alignItems="center" paddingTop={1}>
				{preview.map((line, i) => (
					<text fg={colors[i % colors.length]}>{line}</text>
				))}
			</box>
		);
	};

	// ─── Menú Principal ──────────────────────────────────────────────────────
	const showMainMenu = () => {
		const s = getState();
		const activeId = getActiveId();
		const arts = getArts();
		const activeArt = arts.find(a => a.id === activeId);
		const asciiLabel = activeArt ? `"${activeArt.name}"` : "Arch Linux (defecto)";

		api.ui.dialog.replace(() => (
			<api.ui.DialogSelect
				title="Arch Mask"
				options={[
					{
						title: "Cambiar Tema",
						value: "theme",
						description: "Seleccionar y previsualizar temas disponibles",
						category: "Visual",
					},
					{
						title: `ASCII Art — ${asciiLabel}`,
						value: "ascii",
						description: `${arts.length} arte(s) guardado(s). Gestionar y seleccionar.`,
						category: "Visual",
					},
					{
						title: `Leyenda  ${s.show_legend ? "●  ON" : "○  OFF"}  — "${s.legend_text}"`,
						value: "legend",
						description: "Editar texto o activar/desactivar",
						category: "Pantalla de Inicio",
					},
					{
						title: `Tagline  ${s.show_tagline ? "●  ON" : "○  OFF"}  — "${s.tagline_text}"`,
						value: "tagline",
						description: "Editar texto o activar/desactivar",
						category: "Pantalla de Inicio",
					},
				]}
				onSelect={(opt) => {
					if (opt.value === "theme")   showThemeMenu();
					if (opt.value === "ascii")   showAsciiMenu();
					if (opt.value === "legend")  showLineMenu("legend");
					if (opt.value === "tagline") showLineMenu("tagline");
				}}
				onCancel={() => api.ui.dialog.clear()}
			/>
		));
	};

	// ─── Menú ASCII Art ──────────────────────────────────────────────────────
	const showAsciiMenu = () => {
		const arts = getArts();
		const activeId = getActiveId();

		api.ui.dialog.replace(() => (
			<api.ui.DialogSelect
				title={`ASCII Art — ${getStoreDir()}`}
				options={[
					{
						title: "＋ Cargar desde .txt",
						value: "__add__",
						description: "Ingresa el nombre del archivo (sin .txt)",
						category: "Acciones",
					},
					{
						title: `${!activeId ? "✓ " : ""}Arch Linux (defecto)`,
						value: "__default__",
						description: "Restaurar el logo de Arch Linux original",
						category: "Artes",
					},
					...arts.map(a => ({
						title: `${a.id === activeId ? "✓ " : ""}${a.name}`,
						value: a.id,
						description: `${a.lines.length} líneas · ${(a.colors ?? [a.color]).join(", ")}`,
						category: "Artes",
					})),
					{ title: "← Volver", value: "__back__", category: "─" },
				]}
				current={activeId ?? "__default__"}
				onSelect={(opt) => {
					if (opt.value === "__back__")    { showMainMenu(); return; }
					if (opt.value === "__add__")     { showAsciiLoad(); return; }
					if (opt.value === "__default__") {
						setActiveArtKV(null);
						api.ui.toast({ title: "Arte restaurado", message: "Mostrando logo de Arch Linux", variant: "success" });
						showAsciiMenu();
						return;
					}
					const art = getArts().find(a => a.id === opt.value);
					if (art) showAsciiDetail(art);
				}}
				onCancel={() => showMainMenu()}
			/>
		));
	};

	// ─── Cargar ASCII desde .txt ─────────────────────────────────────────────
	const showAsciiLoad = () => {
		api.ui.dialog.replace(() => (
			<api.ui.DialogPrompt
				title="Nombre del archivo .txt (sin extensión)"
				placeholder={`ej: dragon  →  ${getStoreDir()}/dragon.txt`}
			onConfirm={(input) => {
					const filename = input?.trim().replace(/\.txt$/i, "");
					if (!filename) { showAsciiMenu(); return; }

					const { lines, exists } = readTxt(filename);
					if (!exists) {
						api.ui.toast({
							title: "Archivo no encontrado",
							message: `${getStoreDir()}/${filename}.txt`,
							variant: "error",
						});
						showAsciiLoad();
						return;
					}

					showColorPicker(
						lines,
						[],
						(colors) => {
					const art = addArt({ name: filename, filename, lines, color: colors[0], colors });
						setActiveArtKV(art);
						api.ui.toast({
								title: "Arte cargado",
								message: `"${filename}" — ${lines.length} líneas`,
								variant: "success",
							});
							showAsciiMenu();
						},
						() => showAsciiLoad(),
					);
				}}
				onCancel={() => showAsciiMenu()}
			/>
		));
	};

	// ─── Detalle de un arte ──────────────────────────────────────────────────
	const showAsciiDetail = (art: any) => {
		const isActive = art.id === getActiveArtKV()?.id;
		const colorDesc = art.colors?.length > 1
			? `${art.colors.length} colores`
			: art.color;

		api.ui.dialog.replace(() => (
			<api.ui.DialogSelect
				title={art.name}
				options={[
					{
						title: isActive ? "✓ Activo" : "Activar",
						value: "__activate__",
						description: isActive ? "Ya está activo" : "Mostrar en pantalla de inicio",
						category: "Estado",
					},
					{
						title: "↺ Actualizar desde .txt",
						value: "__reload__",
						description: `Recarga ${art.filename}.txt y actualiza el JSON`,
						category: "Acciones",
					},
					{
						title: "✏ Editar colores",
						value: "__edit_color__",
						description: colorDesc,
						category: "Editar",
					},
					{
						title: "✏ Editar nombre",
						value: "__edit_name__",
						description: `"${art.name}"`,
						category: "Editar",
					},
					{
						title: "🗑 Eliminar",
						value: "__delete__",
						description: "Eliminar del JSON",
						category: "─",
					},
					{ title: "← Volver", value: "__back__", category: "─" },
				]}
				onSelect={(opt) => {
					if (opt.value === "__back__") { showAsciiMenu(); return; }

					if (opt.value === "__activate__") {
						setActiveArtKV(art);
						api.ui.toast({ title: "Arte activado", message: `"${art.name}"`, variant: "success" });
						showAsciiDetail({ ...art });
						return;
					}

					if (opt.value === "__reload__") {
						const { lines, exists } = readTxt(art.filename);
						if (!exists) {
							api.ui.toast({
								title: "Archivo no encontrado",
								message: `${getStoreDir()}/${art.filename}.txt — se mantiene el JSON`,
								variant: "warning",
							});
							showAsciiDetail(art);
							return;
						}
						const updatedArt = { ...art, lines };
						updateArt(art.id, { lines });
						// Si es el activo, actualizar KV para que home_logo re-renderice
						if (isActive) setActiveArtKV(updatedArt);
						api.ui.toast({
							title: "Arte actualizado",
							message: `${lines.length} líneas recargadas`,
							variant: "success",
						});
						showAsciiDetail(updatedArt);
						return;
					}

					if (opt.value === "__edit_color__") {
						showColorPicker(
							art.lines,
							[],
							(colors) => {
								const updatedArt = { ...art, color: colors[0], colors };
								updateArt(art.id, { color: colors[0], colors });
								if (isActive) setActiveArtKV(updatedArt);
								api.ui.toast({ title: "Colores actualizados", message: colors.join(", "), variant: "success" });
								showAsciiDetail(updatedArt);
							},
							() => showAsciiDetail(art),
						);
						return;
					}

					if (opt.value === "__edit_name__") {
						api.ui.dialog.replace(() => (
							<api.ui.DialogPrompt
								title="Nuevo nombre"
								placeholder={art.name}
								value={art.name}
								onConfirm={(input) => {
									const name = input?.trim();
									if (!name) { showAsciiDetail(art); return; }
									updateArt(art.id, { name });
									api.ui.toast({ title: "Nombre actualizado", message: `"${name}"`, variant: "success" });
									showAsciiDetail({ ...art, name });
								}}
								onCancel={() => showAsciiDetail(art)}
							/>
						));
						return;
					}

					if (opt.value === "__delete__") {
						api.ui.dialog.replace(() => (
							<api.ui.DialogSelect
								title={`¿Eliminar "${art.name}"?`}
								options={[
									{ title: "Sí, eliminar", value: "__confirm__", description: "No se puede deshacer" },
									{ title: "← Cancelar",  value: "__cancel__",  category: "─" },
								]}
								onSelect={(c) => {
									if (c.value === "__confirm__") {
										deleteArt(art.id);
										bumpVer();
										api.ui.toast({ title: "Arte eliminado", message: `"${art.name}"`, variant: "success" });
										showAsciiMenu();
									} else {
										showAsciiDetail(art);
									}
								}}
								onCancel={() => showAsciiDetail(art)}
							/>
						));
					}
				}}
				onCancel={() => showAsciiMenu()}
			/>
		));
	};

	// ─── Picker de colores con preview ──────────────────────────────────────
	// Flujo simple: navegar muestra preview en footer, seleccionar confirma.
	// "＋ Agregar 2º color" permite añadir un segundo color alternante.
	const showColorPicker = (
		lines: string[],
		accumulated: string[],        // colores ya elegidos en pasos anteriores
		onConfirm: (colors: string[]) => void,
		onBack: () => void,
	) => {
		const slotNum = accumulated.length + 1;
		const canAddMore = accumulated.length < 3; // máximo 4 colores total

		const safePreview = (colors: string[]) => {
			try { return renderPreview(lines, colors); } catch { return null; }
		};

		const options = [
			...PRESET_COLORS.map(c => ({
				title: c.label,
				value: c.hex,
				description: c.hex,
				footer: safePreview([...accumulated, c.hex]),
			})),
			{ title: "✏ Hex custom", value: "__custom__", description: "Ingresar valor hex manualmente", category: "─" },
			{ title: "← Volver", value: "__back__", category: "─" },
		];

		api.ui.dialog.replace(() => (
			<api.ui.DialogSelect
				title={`Color ${slotNum} — seleccionar confirma${canAddMore ? " · puedes añadir más" : ""}`}
				options={options}
				onSelect={(opt) => {
					if (opt.value === "__back__") { onBack(); return; }

					if (opt.value === "__custom__") {
						api.ui.dialog.replace(() => (
							<api.ui.DialogPrompt
								title={`Color ${slotNum} — valor hex`}
								placeholder="#rrggbb"
								onConfirm={(hex) => {
									const color = hex?.trim() || "#00c8ff";
									askAddMore(lines, [...accumulated, color], onConfirm, onBack);
								}}
								onCancel={() => showColorPicker(lines, accumulated, onConfirm, onBack)}
							/>
						));
						return;
					}

					// Color preset elegido → preguntar si añadir otro
					askAddMore(lines, [...accumulated, opt.value as string], onConfirm, onBack);
				}}
				onCancel={onBack}
			/>
		));
	};

	// Tras elegir un color, preguntar si añadir otro o confirmar
	const askAddMore = (
		lines: string[],
		colors: string[],
		onConfirm: (colors: string[]) => void,
		onBack: () => void,
	) => {
		const canAddMore = colors.length < 4;

		if (!canAddMore) {
			onConfirm(colors);
			return;
		}

		api.ui.dialog.replace(() => (
			<api.ui.DialogSelect
				title={`${colors.length} color(es) elegido(s)`}
				options={[
					{
						title: "✓ Confirmar",
						value: "__confirm__",
						description: `Guardar con ${colors.length} color(es): ${colors.join(", ")}`,
					},
					{
						title: `＋ Añadir color ${colors.length + 1}`,
						value: "__add__",
						description: "Alternar entre más colores por línea",
					},
					{ title: "← Cambiar último", value: "__back__", category: "─" },
				]}
				onSelect={(opt) => {
					if (opt.value === "__confirm__") { onConfirm(colors); return; }
					if (opt.value === "__add__")     { showColorPicker(lines, colors, onConfirm, onBack); return; }
					if (opt.value === "__back__")    { showColorPicker(lines, colors.slice(0, -1), onConfirm, onBack); return; }
				}}
				onCancel={() => showColorPicker(lines, colors.slice(0, -1), onConfirm, onBack)}
			/>
		));
	};

	// ─── Menú por línea ──────────────────────────────────────────────────────
	const showLineMenu = (line: "legend" | "tagline") => {
		const s = getState();
		const label = line === "legend" ? "Leyenda" : "Tagline";
		const currentVisible = line === "legend" ? s.show_legend : s.show_tagline;
		const currentText = line === "legend" ? s.legend_text : s.tagline_text;

		api.ui.dialog.replace(() => (
			<api.ui.DialogSelect
				title={`${label}: "${currentText}"`}
				options={[
					{
						title: currentVisible ? "● Visible — Click para ocultar" : "○ Oculto — Click para mostrar",
						value: "toggle",
						description: currentVisible ? "Se muestra en pantalla de inicio" : "Está oculta",
					},
					{
						title: "✏ Editar texto",
						value: "edit",
						description: `Actual: "${currentText}"`,
					},
					{ title: "← Volver", value: "__back__" },
				]}
				onSelect={(opt) => {
					if (opt.value === "__back__") { showMainMenu(); return; }
					if (opt.value === "toggle") {
						saveConfig({ [`show_${line}`]: !currentVisible });
						bumpVer();
						api.ui.toast({
							title: `${label} ${!currentVisible ? "activada" : "ocultada"}`,
							message: !currentVisible ? "Ahora visible" : "Ya no aparecerá",
							variant: "success",
						});
						showLineMenu(line);
						return;
					}
					if (opt.value === "edit") {
						api.ui.dialog.replace(() => (
							<api.ui.DialogPrompt
								title={`Editar ${label}`}
								placeholder={currentText}
								value={currentText}
								onConfirm={(input) => {
									const text = input?.trim();
									if (!text) { showLineMenu(line); return; }
									saveConfig({ [`${line}_text`]: text });
									bumpVer();
									api.ui.toast({ title: `${label} actualizada`, message: `"${text}"`, variant: "success" });
									showLineMenu(line);
								}}
								onCancel={() => showLineMenu(line)}
							/>
						));
					}
				}}
				onCancel={() => showMainMenu()}
			/>
		));
	};

	// ─── Menú de Temas ───────────────────────────────────────────────────────
	const showThemeMenu = () => {
		const originalTheme = api.theme.selected;

		api.ui.dialog.replace(() => (
			<api.ui.DialogSelect
				title="Arch Mask: Tema"
				options={[
					{ title: "Default (j0k3r-dev-rgl)", value: "j0k3r-dev-rgl", description: "Estilo original con acentos púrpuras y azul Arch." },
					{ title: "Tokyo Night Dev", value: "tokyo-night-dev", description: "Tema dark profesional con fondo transparente (Recomendado)." },
					{ title: "Arch Electric", value: "arch-electric", description: "Tema neón azul eléctrico." },
					{ title: "j0k3r Neon", value: "j0k3r-neon", description: "Inspirado en Arch y verde neón." },
					{ title: "Cyber Arch", value: "arch-cyber", description: "Azules y Grises clásicos de Arch Linux." },
					{ title: "Semáforo Neón", value: "arch-neon", description: "Contraste extremo con verdes y azules neón." },
					{ title: "Overclock", value: "arch-overclock", description: "Estilo agresivo en rosa y blanco puro." },
					{ title: "Cyber Mask", value: "mask-cyber", description: "Futurismo puro: neón azul y rosa fuerte." },
				]}
				current={api.theme.selected}
				onMove={(opt) => { try { api.theme.set(opt.value); } catch (e) {} }}
				onSelect={(opt) => {
					try {
						api.theme.set(opt.value);
						api.kv.set("selected_theme", opt.value);
						api.ui.dialog.clear();
						api.ui.toast({
							title: "Tema Aplicado",
							message: `${opt.title} configurado como predeterminado.`,
							variant: "success",
						});
					} catch (e) {}
				}}
				onCancel={() => {
					try { api.theme.set(originalTheme); } catch (e) {}
					showMainMenu();
				}}
			/>
		));
	};

	// ─── Limpieza al Salir ────────────────────────────────────────────────────
	api.lifecycle.onDispose(() => {
		process.stdout.write("\x1b[?1049l\x1b[?25h");
	});
};

const plugin: TuiPluginModule & { id: string } = { id, tui };
export default plugin;
