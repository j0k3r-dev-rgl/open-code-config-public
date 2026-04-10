// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import {
	archLogoHome,
	archLogoSidebar,
	homeLogoZones,
	sidebarLogoZones,
} from "./ascii-frames";
import type { Cfg } from "./config";
import type { AsciiArt } from "./ascii-store";

// ─── Pantalla Principal: Logo grande de Arch Linux + Leyenda ─────────────────
export const HomeLogo = (props: {
	theme: TuiThemeCurrent;
	config: Cfg;
	activeArt?: AsciiArt | null;
	version?: number;  // cambia para forzar re-render
}) => {
	const t = props.theme;
	const c = props.config;

	const getZoneColor = (zone: string) => {
		if (zone === "hotPink") return t.secondary;
		if (zone === "white") return t.primary;
		if (zone === "purple") return t.accent;
		if (zone === "neonBlue") return t.primary;
		return t.primary;
	};

	// Arte personalizado: flex-start para respetar la indentación original
	// Arte por defecto (Arch): center ya que cada línea tiene padding propio
	const isCustom = !!props.activeArt;

	return (
		<box flexDirection="column" alignItems={isCustom ? "flex-start" : "center"}>
			{/* ASCII art: personalizado si hay uno activo, si no el de Arch por defecto */}
			{props.activeArt
				? props.activeArt.lines.map((line, i) => {
						const art = props.activeArt!;
						const color = art.colors?.length
							? art.colors[i % art.colors.length]
							: art.color;
						return <text fg={color}>{line}</text>;
					})
				: archLogoHome.map((line, i) => {
						const zone = homeLogoZones[i];
						const color = getZoneColor(zone);
						return <text fg={color}>{line}</text>;
					})
			}

			{/* Línea 1: leyenda personalizable */}
			{c.show_legend && (
				<>
					<text> </text>
					<text fg={t.primary} bold={true}>{c.legend_text}</text>
				</>
			)}

			{/* Línea 2: tagline personalizable */}
			{c.show_tagline && (
				<box flexDirection="row" gap={0} marginTop={c.show_legend ? 1 : 2}>
					<text fg={t.textMuted} dimColor={true}>╭ </text>
					<text fg={t.textMuted}>{c.tagline_text}</text>
					<text fg={t.textMuted} dimColor={true}> ╮</text>
				</box>
			)}

			<text> </text>
		</box>
	);
};

// ─── Utilidad de Barra de Progreso ───────────────────────────────────────────
const ProgressBar = (props: {
	value: number;
	width?: number;
	fillColor: string;
	emptyColor: string;
	theme: TuiThemeCurrent;
}) => {
	const width = () => props.width ?? 12;
	const pct = () => Math.max(0, Math.min(100, props.value));
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
export const SidebarArch = (props: {
	theme: TuiThemeCurrent;
	selectedTheme: string;
	config: Cfg;
	branch?: string;
	getMessages?: () => any[];
	contextLimit: number;
}) => {
	if (!props.config.show_sidebar) return null;

	const t = props.theme;

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

	const getTotalCost = () => {
		const messages = props.getMessages ? props.getMessages() : [];
		return messages.reduce(
			(sum, item) => sum + (item.role === "assistant" ? (item.cost ?? 0) : 0),
			0,
		);
	};

	const getContextPct = () => {
		const limit = props.contextLimit || 1_000_000;
		const pct = Math.round((getContextTokens() / limit) * 100);
		return Math.min(100, Math.max(0, pct));
	};

	const getCostPct = () => Math.min(100, Math.round(getTotalCost() * 100));

	const fmtTokens = (n: number) =>
		n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
	const fmtCost = (n: number) => `$${n.toFixed(2)}`;

	return (
		<box flexDirection="column" alignItems="center">
			{archLogoSidebar.map((line, i) => {
				const zone = sidebarLogoZones[i];
				const color = zone === "hotPink" ? t.secondary : t.primary;
				return <text fg={color}>{line}</text>;
			})}

			<text fg={t.textMuted} scale={0.9}>j0k3r@latest</text>
			<text> </text>

			{props.branch && (
				<box flexDirection="row" gap={1}>
					<text fg={t.accent}>⎇</text>
					<text fg={t.text} bold={true}>{props.branch}</text>
				</box>
			)}

			<box flexDirection="column" alignItems="center" marginTop={1}>
				<text fg={t.textMuted} bold={true}>Contexto</text>

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
