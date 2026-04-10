// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import {
	archLogoHome,
	archLogoSidebar,
	homeLogoZones,
	sidebarLogoZones,
	zoneColors,
} from "./ascii-frames";
import type { Cfg } from "./config";
import { getOSName, getProviders } from "./detection";

// ─── Pantalla Principal: Logo grande de Arch Linux + Leyenda ─────────────────
/**
 * Componente que muestra el logo de Arch Linux a gran escala en la pantalla de inicio.
 * Utiliza un sistema de mapeo por zonas para aplicar diferentes colores del tema actual
 * a cada parte del arte ASCII, permitiendo que el logo se adapte visualmente a cualquier tema.
 * 
 * @param props Contiene el tema actual de la TUI.
 */
export const HomeLogo = (props: { theme: TuiThemeCurrent }) => {
	const t = props.theme;

	/**
	 * Mapea una zona de color definida en el frame ASCII a una propiedad del tema actual.
	 * @param zone Nombre de la zona (ej. 'hotPink', 'white', 'purple').
	 */
	const getZoneColor = (zone: string) => {
		if (zone === "hotPink") return t.secondary;
		if (zone === "white") return t.primary;
		if (zone === "purple") return t.accent;
		if (zone === "neonBlue") return t.primary;
		return t.primary;
	};

	return (
		<box flexDirection="column" alignItems="center">
			{/* Mapeo del arte ASCII línea por línea aplicando colores según su zona */}
			{archLogoHome.map((line, i) => {
				const zone = homeLogoZones[i];
				const color = getZoneColor(zone);
				return <text fg={color}>{line}</text>;
			})}

			<text> </text>
			{/* Leyenda personalizada estilo CLI debajor del logo */}
			<box flexDirection="row" gap={0}>
				<text fg={t.secondary} bold={true}>
					j0k3r
				</text>
				<text fg={t.accent}>-</text>
				<text fg={t.primary} bold={true}>
					dev
				</text>
				<text fg={t.accent}>-</text>
				<text fg={t.info} bold={true}>
					rgl
				</text>
				<text fg={t.accent}>@</text>
				<text fg={t.warning} bold={true}>
					latest
				</text>
			</box>

			<box flexDirection="row" gap={0} marginTop={1}>
				<text fg={t.textMuted} dimColor={true}>
					╭{" "}
				</text>
				<text fg={t.textMuted}>arch linux </text>
				<text fg={t.textMuted} dimColor={true}>
					·
				</text>
				<text fg={t.textMuted}> opencode </text>
				<text fg={t.textMuted} dimColor={true}>
					╮
				</text>
			</box>

			<text> </text>
		</box>
	);
};

// ─── Utilidad de Barra de Progreso ───────────────────────────────────────────
/**
 * Un componente visual que renderiza una barra de progreso estilo consola.
 * Utiliza caracteres de bloque (█ y ░) para representar el llenado.
 */
const ProgressBar = (props: {
	value: number;        // Porcentaje (0-100)
	width?: number;       // Ancho total de la barra en caracteres
	fillColor: string;    // Color de la parte llena
	emptyColor: string;   // Color de la parte vacía
	theme: TuiThemeCurrent;
}) => {
	const width = () => props.width ?? 12;
	const pct = () => Math.max(0, Math.min(100, props.value));
	
	/**
	 * Calcula cuántos bloques de '█' deben mostrarse.
	 * Garantiza que si el porcentaje es > 0, al menos se vea 1 bloque.
	 */
	const filled = () => {
		const f = Math.round((pct() / 100) * width());
		return pct() > 0 && f === 0 ? 1 : f;
	};
	const empty = () => width() - filled();

	return (
		<box flexDirection="row" gap={0}>
			<text fg={props.theme.textMuted}>[</text>
			<text fg={props.fillColor}>{"█".repeat(filled())}</text>
			<text fg={props.emptyColor}>{"░".repeat(empty())}</text>
			<text fg={props.theme.textMuted}>]</text>
		</box>
	);
};

// ─── Sidebar: Logo de Arch + Panel de Estadísticas ───────────────────────────
/**
 * Componente principal del panel lateral.
 * Muestra una versión mini del logo de Arch Linux, la rama de Git actual y 
 * estadísticas detalladas de uso del contexto (tokens y costo estimado).
 */
export const SidebarArch = (props: {
	theme: TuiThemeCurrent;
	selectedTheme: string; // ID del tema activo
	config: Cfg;
	branch?: string;       // Rama git actual detectada
	getMessages?: () => any[]; // Función para obtener el historial de mensajes
	contextLimit: number;  // Límite de tokens del contexto
}) => {
	if (!props.config.show_sidebar) return null;

	const t = props.theme;

	/**
	 * Calcula el total de tokens utilizados en el último mensaje del asistente.
	 */
	const getContextTokens = () => {
		const messages = props.getMessages ? props.getMessages() : [];
		const last = [...messages]
			.reverse()
			.find((m: any) => m.role === "assistant" && m.tokens?.output > 0);
		if (!last) return 0;

		const tk = last.tokens;
		return (
			(tk.input ?? 0) +
			(tk.output ?? 0) +
			(tk.reasoning ?? 0) +
			(tk.cache?.read ?? 0) +
			(tk.cache?.write ?? 0)
		);
	};

	/**
	 * Suma el costo acumulado de todos los mensajes en la sesión actual.
	 */
	const getTotalCost = () => {
		const messages = props.getMessages ? props.getMessages() : [];
		return messages.reduce(
			(sum, item) => sum + (item.role === "assistant" ? (item.cost ?? 0) : 0),
			0,
		);
	};

	/**
	 * Calcula el porcentaje de ocupación del contexto actual respecto al límite.
	 */
	const getContextPct = () => {
		const limit = props.contextLimit || 1_000_000;
		const pct = Math.round((getContextTokens() / limit) * 100);
		return Math.min(100, Math.max(0, pct));
	};

	/**
	 * Calcula el porcentaje de presupuesto gastado (asume un máximo de $1 para visualización).
	 */
	const getCostPct = () => Math.min(100, Math.round(getTotalCost() * 100));

	const fmtTokens = (n: number) =>
		n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
	const fmtCost = (n: number) => `$${n.toFixed(2)}`;

	return (
		<box flexDirection="column" alignItems="center">
			{/* Mini logo de Arch adaptado al tema */}
			{archLogoSidebar.map((line, i) => {
				const zone = sidebarLogoZones[i];
				const color = zone === "hotPink" ? t.secondary : t.primary;
				return <text fg={color}>{line}</text>;
			})}

			<text fg={t.textMuted} scale={0.9}>j0k3r@latest</text>
			<text> </text>

			{/* Indicador de rama Git */}
			{props.branch && (
				<box flexDirection="row" gap={1}>
					<text fg={t.accent}>⎇</text>
					<text fg={t.text} bold={true}>{props.branch}</text>
				</box>
			)}

			{/* ── Sección de Contexto (tokens + % usado + costo) ── */}
			<box flexDirection="column" alignItems="center" marginTop={1}>
				<text fg={t.textMuted} bold={true}>Contexto</text>

				{/* Barra de Tokens - Color Primario */}
				<box flexDirection="row" gap={1} marginTop={0.5}>
					<text fg={t.primary} bold={true}>{fmtTokens(getContextTokens())}</text>
					<text fg={t.textMuted}>tokens</text>
				</box>
				<ProgressBar
					value={getContextPct()}
					width={18}
					fillColor={t.primary}
					emptyColor={t.borderSubtle}
					theme={t}
				/>

				{/* Barra de Uso - Color Secundario */}
				<box flexDirection="row" gap={1} marginTop={0.5}>
					<text fg={t.secondary} bold={true}>{getContextPct()}%</text>
					<text fg={t.textMuted}>usado</text>
				</box>
				<ProgressBar
					value={getContextPct()}
					width={18}
					fillColor={t.secondary}
					emptyColor={t.borderSubtle}
					theme={t}
				/>

				{/* Barra de Costo - Color de Advertencia (Warning) */}
				<box flexDirection="row" gap={1} marginTop={0.5}>
					<text fg={t.warning} bold={true}>{fmtCost(getTotalCost())}</text>
					<text fg={t.textMuted}>gastado</text>
				</box>
				<ProgressBar
					value={getCostPct()}
					width={18}
					fillColor={t.warning}
					emptyColor={t.borderSubtle}
					theme={t}
				/>
			</box>

			<text> </text>
			<text fg={t.textMuted} dimColor={true} scale={0.8}>
				máscara: {props.selectedTheme.toUpperCase()}
			</text>
		</box>
	);
};

// ─── Línea de detección de entorno ───────────────────────────────────────────
/**
 * Muestra información sobre el sistema operativo y los proveedores de IA 
 * activos al final de la pantalla de inicio.
 */
export const DetectedEnv = (props: {
	theme: TuiThemeCurrent;
	providers: ReadonlyArray<{ id: string; name: string }> | undefined;
	config: Cfg;
}) => {
	if (!props.config.show_detected) return null;

	const os = props.config.show_os ? getOSName() : null;
	const providers = props.config.show_providers
		? getProviders(props.providers)
		: null;

	if (!os && !providers) return null;

	return (
		<box flexDirection="row" gap={1}>
			<text fg={props.theme.textMuted}>detectado:</text>
			{os && <text fg={props.theme.text}>{os}</text>}
			{os && providers && <text fg={props.theme.textMuted}>·</text>}
			{providers && <text fg={props.theme.text}>{providers}</text>}
		</box>
	);
};
