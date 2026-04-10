// @ts-nocheck
/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { DetectedEnv, HomeLogo, SidebarArch } from "./components";
import { cfg } from "./config";

const id = "j0k3r-dev-rgl";

/**
 * Función de utilidad para convertir objetos desconocidos en diccionarios planos.
 */
const rec = (value: unknown) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return;
	return Object.fromEntries(Object.entries(value));
};

/**
 * Punto de entrada principal para el plugin Arch Mask.
 * Este plugin personaliza la interfaz de usuario (TUI) de OpenCode con una estética inspirada en Arch Linux.
 * 
 * @param api La API de la TUI proporcionada por el sistema de plugins.
 * @param options Opciones de configuración del usuario.
 */
const tui: TuiPlugin = async (api, options) => {
	// Cargar y validar la configuración
	const boot = cfg(rec(options));
	if (!boot.enabled) return;

	/**
	 * Resuelve la ruta absoluta de un archivo de tema JSON.
	 */
	const resolveTheme = (name: string) =>
		new URL(`./themes/${name}.json`, import.meta.url).pathname;

	// ─── Instalación de Temas ────────────────────────────────────────────────
	// Registra todos los esquemas de color disponibles en el sistema de la TUI.
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

	// ─── Rutas Personalizadas ───────────────────────────────────────────────
	/**
	 * Registramos una ruta dedicada para LazyGit. 
	 * Al navegar a esta ruta, OpenTUI desmonta la máscara de Arch, dejando la pantalla limpia.
	 */
	api.route.register([
		{
			name: "lazygit",
			render: () => {
				// Este componente se renderiza justo antes de lanzar el proceso
				return (
					<box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
						<text fg={boot.theme === "j0k3r-dev-rgl" ? "#ff2d78" : api.theme.current.primary}>
							Iniciando LazyGit...
						</text>
					</box>
				);
			}
		}
	]);

	// ─── Manejo de Atajos Globales (Incluso en Chat) ─────────────────────────
	/**
	 * Los componentes de entrada (Prompt) suelen capturar las teclas.
	 * Usamos prependInputHandler para interceptar ctrl+g y ctrl+m antes que ellos.
	 */
	if (api.renderer && typeof api.renderer.prependInputHandler === "function") {
		api.renderer.prependInputHandler((seq: string) => {
			// alt+g (ESC + g / \x1bg)
			if (seq === "\x1bg") {
				api.command.trigger("lazygit");
				return true; // Evento consumido
			}
			return false;
		});
	}

	// ─── Comandos y Atajos ───────────────────────────────────────────────────
	api.command.register(() => [
		{
			title: "Gestión de Perfiles",
			value: "profiles",
			description: "Crear, seleccionar o editar perfiles de agentes",
			keybind: "alt+p",
			slash: { name: "profiles" },
			onSelect: () => {
				const { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } = require("fs");
				const { join } = require("path");
				const { homedir } = require("os");

				/**
				 * Resuelve las rutas de OpenCode replicando exactamente la lógica
				 * del binario (src/global/index.ts → init_xdg_basedir):
				 *
				 *   config → XDG_CONFIG_HOME/opencode   → ~/.config/opencode
				 *
				 * En Windows y macOS homedir() devuelve la ruta correcta
				 * (C:\Users\<user> y /Users/<user> respectivamente) y OpenCode
				 * NO usa AppData ni Library/Application Support — usa XDG en
				 * todas las plataformas.
				 */
				const home = homedir();
				const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, ".config");

				const opencodeConfig = join(xdgConfig, "opencode");

				const profilesDir = join(opencodeConfig, "profiles");
				const configPath  = join(opencodeConfig, "opencode.json");

				if (!existsSync(profilesDir)) {
					try {
						mkdirSync(profilesDir, { recursive: true });
					} catch (e) {}
				}

				// ── Activar perfil ──────────────────────────────────────────────────

				const activateProfile = (fileName: string, profileName: string, onSuccess: () => void) => {
					try {
						const raw = readFileSync(join(profilesDir, fileName), "utf-8");

						// Persistir en disco (opencode.json global)
						writeFileSync(configPath, raw);
					} catch (e) {
						api.ui.toast({ title: "Error", message: "No se pudo guardar el perfil", variant: "error" });
						return;
					}

					// Mostrar modal informando que hay que reiniciar
					api.ui.dialog.replace(() => (
						<api.ui.DialogConfirm
							title={`Perfil '${profileName}' activado`}
							message={`El perfil fue guardado correctamente.\n\nReinicia OpenCode para que los modelos de los agentes se carguen en la sesión.`}
							onConfirm={() => onSuccess()}
							onCancel={() => onSuccess()}
						/>
					));
				};

				const NAV_CATEGORY = "─────────────";

				// Formatea el contexto como "128K" o "1M"
				const formatContext = (tokens: number): string => {
					if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
					if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
					return String(tokens);
				};

				// Busca el modelo en los providers activos y devuelve info de contexto
				const resolveModelInfo = (modelId: string): string => {
					if (!modelId) return "Sin asignar";
					const [providerID, ...rest] = modelId.split("/");
					const modelKey = rest.join("/");
					const provider = api.state.provider.find(p => p.id === providerID);
					const model = provider?.models?.[modelKey] as any;
					const ctx = model?.limit?.context;
					const ctxStr = ctx ? ` (${formatContext(ctx)})` : "";
					return `${modelId}${ctxStr}`;
				};

				// ── Menús ────────────────────────────────────────────────────────

				// Lee el tipo guardado en el JSON del perfil
				const getProfileType = (fileName: string): "general" | "sdd" => {
					try {
						const content = JSON.parse(readFileSync(join(profilesDir, fileName), "utf-8"));
						return content._profileType === "sdd" ? "sdd" : "general";
					} catch (e) {
						return "general";
					}
				};

				// Filtra agentes según el tipo de perfil
				const filterAgentsByType = (agents: Record<string, any>, type: "general" | "sdd") => {
					return Object.entries(agents).filter(([name]) =>
						type === "sdd" ? name.startsWith("sdd-") : !name.startsWith("sdd-")
					);
				};

				// Compara los modelos de cada agente del perfil con los de la config activa.
				// Devuelve el fileName del perfil que coincide, o undefined si ninguno.
				const detectActiveProfile = (files: string[]): string | undefined => {
					const activeAgents = (api.state.config as any)?.agent || {};

					for (const file of files) {
						try {
							const profile = JSON.parse(readFileSync(join(profilesDir, file), "utf-8"));
							const profileAgents = profile.agent || {};
							const keys = Object.keys(profileAgents);
							if (keys.length === 0) continue;

							// Todos los agentes del perfil deben coincidir con la config activa
							const allMatch = keys.every(agentName => {
								const profileModel = profileAgents[agentName]?.model;
								const activeModel = activeAgents[agentName]?.model;
								return profileModel && profileModel === activeModel;
							});

							if (allMatch) return file;
						} catch (e) {}
					}
					return undefined;
				};

				const showProfilesMenu = () => {
					api.ui.dialog.replace(() => (
						<api.ui.DialogSelect
							title="Gestión de Perfiles"
							options={[
								{
									title: "Crear perfil",
									value: "create",
									description: "Crea un nuevo perfil a partir de la config actual.",
								},
								{
									title: "Asignar perfil General",
									value: "assign_general",
									description: "Activa un perfil de agentes generales.",
								},
								{
									title: "Asignar perfil SDD",
									value: "assign_sdd",
									description: "Activa un perfil de agentes SDD.",
								},
								{
									title: "✕ Cerrar",
									value: "__close__",
									description: "Cerrar este menú.",
									category: NAV_CATEGORY,
								},
							]}
							onSelect={(opt) => {
								if (opt.value === "create") {
									// Paso 1: pedir nombre
									api.ui.dialog.replace(() => (
										<api.ui.DialogPrompt
											title="Nuevo Perfil"
											placeholder="Introduce el nombre del perfil..."
											onConfirm={(inputName) => {
												const name = inputName?.trim();
												if (!name) { showProfilesMenu(); return; }
												const profilePath = join(profilesDir, `${name}.json`);
												if (existsSync(profilePath)) {
													api.ui.toast({ title: "Error", message: "El perfil ya existe", variant: "error" });
													showProfilesMenu();
													return;
												}
												// Paso 2: elegir tipo
												api.ui.dialog.replace(() => (
													<api.ui.DialogSelect
														title={`Tipo de perfil: ${name}`}
														options={[
															{
																title: "General",
																value: "general",
																description: "Agentes sin prefijo sdd-",
															},
															{
																title: "SDD",
																value: "sdd",
																description: "Agentes con prefijo sdd-",
															},
															{
																title: "← Volver",
																value: "__back__",
																description: "Cancelar y volver al menú",
																category: NAV_CATEGORY,
															},
														]}
														onSelect={(typeOpt) => {
															if (typeOpt.value === "__back__") { showProfilesMenu(); return; }
															try {
																const currentConfig = JSON.parse(readFileSync(configPath, "utf-8"));
																currentConfig._profileType = typeOpt.value;
																writeFileSync(profilePath, JSON.stringify(currentConfig, null, "\t"));
																api.ui.toast({ title: "Éxito", message: `Perfil '${name}' (${typeOpt.title}) creado`, variant: "success" });
																showProfilesMenu();
															} catch (e) {
																api.ui.toast({ title: "Error", message: "No se pudo crear el perfil", variant: "error" });
																showProfilesMenu();
															}
														}}
														onCancel={() => showProfilesMenu()}
													/>
												));
											}}
											onCancel={() => showProfilesMenu()}
										/>
									));
								} else if (opt.value === "assign_general") {
									showProfileList("general");
								} else if (opt.value === "assign_sdd") {
									showProfileList("sdd");
								} else if (opt.value === "__close__") {
									api.ui.dialog.clear();
								}
							}}
							onCancel={() => api.ui.dialog.clear()}
						/>
					));
				};

				// Lista de perfiles filtrada por tipo
				const showProfileList = (type: "general" | "sdd") => {
					try {
						const allFiles = readdirSync(profilesDir).filter(f => f.endsWith(".json"));
						const files = allFiles.filter(f => getProfileType(f) === type);
						const label = type === "sdd" ? "SDD" : "General";

						if (files.length === 0) {
							api.ui.toast({ title: "Aviso", message: `No hay perfiles ${label} creados`, variant: "warning" });
							showProfilesMenu();
							return;
						}

						const activeFile = detectActiveProfile(files);

						api.ui.dialog.replace(() => (
							<api.ui.DialogSelect
								title={`Asignar Perfil ${label}`}
								current={activeFile}
								options={[
									...files.map(f => ({
										title: f.replace(".json", ""),
										value: f,
										description: f === activeFile ? "✓ Activo" : `Perfil ${label}`,
									})),
									{
										title: "← Volver",
										value: "__back__",
										description: "Volver al menú principal",
										category: NAV_CATEGORY,
									},
								]}
								onSelect={(opt) => {
									if (opt.value === "__back__") { showProfilesMenu(); return; }
									showProfileDetail({ title: opt.title, value: opt.value });
								}}
								onCancel={() => showProfilesMenu()}
							/>
						));
					} catch (e) {
						api.ui.toast({ title: "Error", message: "No se pudo leer la carpeta de perfiles", variant: "error" });
					}
				};

				// Vista de detalle: muestra info + lista de agentes (solo lectura) + 3 botones
				const showProfileDetail = (profileOpt) => {
					try {
						const profileContent = JSON.parse(readFileSync(join(profilesDir, profileOpt.value), "utf-8"));
						const allAgents = profileContent.agent || {};
						const type = profileContent._profileType === "sdd" ? "sdd" : "general";
						const agents = filterAgentsByType(allAgents, type);
						const label = type === "sdd" ? "SDD" : "General";

						api.ui.dialog.replace(() => (
							<api.ui.DialogSelect
								title={`Perfil ${label}: ${profileOpt.title}`}
								options={[
									{
										title: `✏ Nombre: ${profileOpt.title}`,
										value: "__rename__",
										description: "Editar el nombre de este perfil",
										category: "Perfil",
									},
									...agents.map(([agentName, data]: [string, any]) => ({
										title: agentName,
										value: `__noop__${agentName}`,
										description: resolveModelInfo(data.model),
										category: "Agentes",
									})),
									{
										title: "✎ Editar agentes",
										value: "__edit__",
										description: "Cambiar el modelo de cada agente",
										category: NAV_CATEGORY,
									},
									{
										title: "✓ Asignar perfil",
										value: "__assign__",
										description: "Activar este perfil (requiere reinicio)",
										category: NAV_CATEGORY,
									},
									{
										title: "✕ Eliminar perfil",
										value: "__delete__",
										description: "Eliminar este perfil permanentemente",
										category: NAV_CATEGORY,
									},
									{
										title: "← Volver",
										value: "__back__",
										description: "Volver a la lista de perfiles",
										category: NAV_CATEGORY,
									},
								]}
								onSelect={(opt) => {
									if (opt.value === "__back__") {
										showProfileList(type);
									} else if (opt.value === "__assign__") {
										activateProfile(profileOpt.value, profileOpt.title, () => showProfileList(type));
									} else if (opt.value === "__delete__") {
										api.ui.dialog.replace(() => (
											<api.ui.DialogSelect
												title={`¿Eliminar '${profileOpt.title}'?`}
												options={[
													{
														title: "Sí, eliminar",
														value: "__confirm__",
														description: "Esta acción no se puede deshacer",
													},
													{
														title: "← Cancelar",
														value: "__cancel__",
														description: "Volver al detalle del perfil",
														category: NAV_CATEGORY,
													},
												]}
												onSelect={(confirmOpt) => {
													if (confirmOpt.value === "__cancel__") {
														showProfileDetail(profileOpt);
														return;
													}
													try {
														const { unlinkSync } = require("fs");
														unlinkSync(join(profilesDir, profileOpt.value));
														api.ui.toast({ title: "Perfil eliminado", message: `'${profileOpt.title}' ha sido eliminado`, variant: "success" });
														showProfileList(type);
													} catch (e) {
														api.ui.toast({ title: "Error", message: "No se pudo eliminar el perfil", variant: "error" });
														showProfileDetail(profileOpt);
													}
												}}
												onCancel={() => showProfileDetail(profileOpt)}
											/>
										));
									} else if (opt.value === "__edit__") {
										showAgentEditor(profileOpt);
									} else if (opt.value === "__rename__") {
										api.ui.dialog.replace(() => (
											<api.ui.DialogPrompt
												title="Renombrar Perfil"
												placeholder="Nuevo nombre..."
												value={profileOpt.title}
												onConfirm={(inputNewName) => {
													const newName = inputNewName?.trim();
													if (!newName || newName === profileOpt.title) {
														showProfileDetail(profileOpt);
														return;
													}
													try {
														const { renameSync } = require("fs");
														const oldPath = join(profilesDir, profileOpt.value);
														const newFileName = `${newName}.json`;
														const newPath = join(profilesDir, newFileName);
														if (existsSync(newPath)) {
															api.ui.toast({ title: "Error", message: "Ya existe un perfil con ese nombre", variant: "error" });
															showProfileDetail(profileOpt);
															return;
														}
														renameSync(oldPath, newPath);
														api.ui.toast({ title: "Éxito", message: "Perfil renombrado", variant: "success" });
														showProfileDetail({ title: newName, value: newFileName });
													} catch (e) {
														api.ui.toast({ title: "Error", message: "No se pudo renombrar el perfil", variant: "error" });
														showProfileDetail(profileOpt);
													}
												}}
												onCancel={() => showProfileDetail(profileOpt)}
											/>
										));
									}
									// __noop__* : los agentes no hacen nada en esta vista
								}}
								onCancel={() => showProfileList(type)}
							/>
						));
					} catch (e) {
						api.ui.toast({ title: "Error", message: "No se pudo leer el perfil", variant: "error" });
					}
				};

				// Vista de edición: agentes seleccionables para cambiar modelo, cursor persiste
				const showAgentEditor = (profileOpt, focusAgent?: string) => {
					try {
						const profileContent = JSON.parse(readFileSync(join(profilesDir, profileOpt.value), "utf-8"));
						const allAgents = profileContent.agent || {};
						const type = profileContent._profileType === "sdd" ? "sdd" : "general";
						const agents = filterAgentsByType(allAgents, type);

						if (agents.length === 0) {
							api.ui.toast({ title: "Aviso", message: "Este perfil no tiene agentes configurados", variant: "warning" });
							showProfileDetail(profileOpt);
							return;
						}

						api.ui.dialog.replace(() => (
							<api.ui.DialogSelect
								title={`Editar agentes: ${profileOpt.title}`}
								current={focusAgent}
								options={[
									...agents.map(([agentName, data]: [string, any]) => ({
										title: agentName,
										value: agentName,
										description: resolveModelInfo(data.model),
									})),
									{
										title: "← Volver",
										value: "__back__",
										description: "Volver al detalle del perfil",
										category: NAV_CATEGORY,
									},
								]}
								onSelect={(opt) => {
									if (opt.value === "__back__") {
										showProfileDetail(profileOpt);
									} else {
										showModelPicker(profileOpt, opt.value);
									}
								}}
								onCancel={() => showProfileDetail(profileOpt)}
							/>
						));
					} catch (e) {
						api.ui.toast({ title: "Error", message: "No se pudo leer el perfil", variant: "error" });
					}
				};

				// Paso 1: seleccionar provider
				const showModelPicker = (profileOpt, agentName: string) => {
					const providers = api.state.provider;

					if (providers.length === 0) {
						api.ui.toast({ title: "Sin providers", message: "No hay providers autenticados en OpenCode", variant: "warning" });
						showAgentEditor(profileOpt, agentName);
						return;
					}

					api.ui.dialog.replace(() => (
						<api.ui.DialogSelect
							title={`Provider para: ${agentName}`}
							options={[
								...providers.map(p => ({
									title: p.name || p.id,
									value: p.id,
									description: `${Object.keys(p.models).length} modelos disponibles`,
								})),
								{
									title: "← Volver",
									value: "__back__",
									description: "Volver a los agentes",
									category: NAV_CATEGORY,
								},
							]}
							onSelect={(provOpt) => {
								if (provOpt.value === "__back__") {
									showAgentEditor(profileOpt, agentName);
									return;
								}
								const provider = providers.find(p => p.id === provOpt.value);
								if (provider) showModelFromProvider(profileOpt, agentName, provider);
							}}
							onCancel={() => showAgentEditor(profileOpt, agentName)}
						/>
					));
				};

				// Paso 2: seleccionar modelo del provider elegido
				const showModelFromProvider = (profileOpt, agentName: string, provider) => {
					let currentModel: string | undefined;
					try {
						const profileContent = JSON.parse(readFileSync(join(profilesDir, profileOpt.value), "utf-8"));
						const saved = profileContent.agent?.[agentName]?.model as string | undefined;
						if (saved?.startsWith(`${provider.id}/`)) currentModel = saved;
					} catch (e) {}

					const modelOptions = Object.entries(provider.models).map(([modelID, model]: [string, any]) => {
						const ctx = model?.limit?.context;
						const ctxStr = ctx ? ` (${formatContext(ctx)})` : "";
						return {
							title: `${model?.name || modelID}${ctxStr}`,
							value: `${provider.id}/${modelID}`,
							description: `${provider.id}/${modelID}`,
						};
					});

					api.ui.dialog.replace(() => (
						<api.ui.DialogSelect
							title={`${provider.name || provider.id} › ${agentName}`}
							current={currentModel}
							options={[
								...modelOptions,
								{
									title: "← Cambiar provider",
									value: "__back__",
									description: "Volver a la lista de providers",
									category: NAV_CATEGORY,
								},
							]}
							onSelect={(modelOpt) => {
								if (modelOpt.value === "__back__") {
									showModelPicker(profileOpt, agentName);
									return;
								}
								try {
									const profilePath = join(profilesDir, profileOpt.value);
									const profileContent = JSON.parse(readFileSync(profilePath, "utf-8"));
									if (!profileContent.agent) profileContent.agent = {};
									if (!profileContent.agent[agentName]) profileContent.agent[agentName] = {};
									profileContent.agent[agentName].model = modelOpt.value;
									writeFileSync(profilePath, JSON.stringify(profileContent, null, "\t"));
									api.ui.toast({
										title: "Modelo actualizado",
										message: `${agentName} → ${modelOpt.value}`,
										variant: "success",
									});
									// Volver al editor con el cursor sobre el agente que se acaba de editar
									showAgentEditor(profileOpt, agentName);
								} catch (e) {
									api.ui.toast({ title: "Error", message: "No se pudo guardar el modelo", variant: "error" });
									showAgentEditor(profileOpt, agentName);
								}
							}}
							onCancel={() => showModelPicker(profileOpt, agentName)}
						/>
					));
				};

				showProfilesMenu();
			},
		},
		{
			title: "Cambiar Máscara",
			value: "mask",
			description: "Cambiar el estilo visual de Arch Mask",
			keybind: "alt+m",
			slash: { name: "mask" },
			onSelect: () => {
				// Guardamos el tema actual por si el usuario cancela la selección
				const originalTheme = api.theme.selected;

				// Abrir un diálogo de selección con previsualización en tiempo real
				api.ui.dialog.replace(() => (
					<api.ui.DialogSelect
						title="Arch Mask: Theme Preview"
						options={[
							{ 
								title: "Default (j0k3r-dev-rgl)", 
								value: "j0k3r-dev-rgl",
								description: "Estilo original con acentos púrpuras y azul Arch." 
							},
							{ 
								title: "Tokyo Night Dev", 
								value: "tokyo-night-dev",
								description: "Lindo tema dark profesional con fondo transparente (Recomendado)." 
							},
							{ 
								title: "Arch Electric", 
								value: "arch-electric",
								description: "Tema neón azul eléctrico que combina con tu fondo de pantalla." 
							},
							{ 
								title: "j0k3r Neon", 
								value: "j0k3r-neon",
								description: "Inspirado en tu logo de Arch y nombre en verde neón." 
							},
							{ 
								title: "Cyber Arch", 
								value: "arch-cyber",
								description: "Inspirado en los colores clásicos de Arch Linux (Azules y Grises)." 
							},
							{ 
								title: "Semáforo Neón", 
								value: "arch-neon",
								description: "Contraste extremo con verdes y azules neón." 
							},
							{ 
								title: "Overclock", 
								value: "arch-overclock",
								description: "Estilo agresivo en rosa y blanco puro." 
							},
							{ 
								title: "Cyber Mask", 
								value: "mask-cyber",
								description: "Futurismo puro: neón azul y rosa fuerte." 
							},
						]}
						current={api.theme.selected}
						/**
						 * Lógica de Previsualización:
						 * El evento 'onMove' se dispara cada vez que el usuario navega por la lista.
						 * Cambiamos el tema global instantáneamente para que el usuario vea el resultado.
						 */
						onMove={(opt) => {
							try {
								api.theme.set(opt.value);
							} catch (e) {}
						}}
						/**
						 * Lógica de Confirmación:
						 * Aplica el tema definitivamente y lo guarda en el almacenamiento persistente (KV).
						 */
						onSelect={(opt) => {
							try {
								api.theme.set(opt.value);
								api.kv.set("selected_theme", opt.value);
								api.ui.dialog.clear();
								api.ui.toast({
									title: "Máscara Aplicada",
									message: `Tema ${opt.title} configurado como predeterminado.`,
									variant: "success",
								});
							} catch (e) {}
						}}
						/**
						 * Lógica de Cancelación:
						 * Si el usuario presiona ESC o cierra el diálogo, restauramos el tema que estaba antes.
						 */
						onCancel={() => {
							try {
								api.theme.set(originalTheme);
							} catch (e) {}
							api.ui.dialog.clear();
						}}
					/>
				));
			},
		},
		{
			title: "Restaurar OpenCode",
			value: "restore",
			description: "Desinstala Arch Mask y vuelve a la interfaz original",
			slash: { name: "restore" },
			onSelect: () => {
				api.ui.dialog.replace(() => (
					<api.ui.DialogSelect
						title="¿Restaurar OpenCode?"
						options={[
							{ 
								title: "No, cancelar", 
								value: "no",
								description: "Mantener mi máscara de Arch activa." 
							},
							{ 
								title: "Sí, desinstalar y salir", 
								value: "yes",
								description: "Elimina Arch Mask de tui.json y cierra OpenCode." 
							},
						]}
						onSelect={(opt) => {
							if (opt.value === "no") {
								api.ui.dialog.clear();
								return;
							}

							try {
								// @ts-ignore
								const { readFileSync, writeFileSync } = require("fs");
								// @ts-ignore
								const { join } = require("path");
								// @ts-ignore
								const { homedir } = require("os");

								const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
								const configPath = join(xdgConfig, "opencode", "tui.json");
								
								const configStr = readFileSync(configPath, "utf-8");
								const config = JSON.parse(configStr);

								if (config.plugin && Array.isArray(config.plugin)) {
									config.plugin = config.plugin.filter((p: any) => {
										const pluginPath = Array.isArray(p) ? p[0] : p;
										return typeof pluginPath === 'string' && !pluginPath.includes("opencode-mask");
									});
								}

								writeFileSync(configPath, JSON.stringify(config, null, "\t"));

								api.ui.toast({
									title: "Desinstalación exitosa",
									message: "Arch Mask ha sido removido. Saliendo...",
									variant: "success",
								});

								setTimeout(() => process.exit(0), 1500);
							} catch (e) {
								api.ui.toast({
									title: "Error al restaurar",
									message: "No se pudo acceder a ~/.config/opencode/tui.json",
									variant: "error",
								});
							}
						}}
						onCancel={() => api.ui.dialog.clear()}
					/>
				));
			},
		},
		{
			title: "Abrir LazyGit",
			value: "lazygit",
			description: "Abrir la interfaz interactiva de Git",
			keybind: "alt+g",
			slash: { name: "lazygit" },
			onSelect: () => {
				try {
					// @ts-ignore
					const { spawnSync } = require("child_process");

					// 1. Validamos si es un repositorio git
					const isGit = spawnSync("git", ["rev-parse", "--is-inside-work-tree"]);
					if (isGit.status !== 0) {
						api.ui.toast({
							title: "No es un repositorio Git",
							message: "Ejecuta 'git init' en tu terminal para poder usar LazyGit.",
							variant: "warning",
						});
						return;
					}

					// 2. Guardamos la ruta actual antes de navegar
					const prevRoute = api.route.current;

					// 3. Navegamos a la ruta de limpieza para que OpenTUI desmonte sus componentes
					api.route.navigate("lazygit");

					// 4. Esperamos un frame para que OpenTUI termine de desmontarse
					setTimeout(() => {
						try {
							// ── Salida del alternate screen buffer de OpenCode ──
							// OpenCode vive en el alternate screen. Salimos de él para que
							// lazygit tenga la terminal limpia sin interferencias.
							process.stdout.write("\x1b[?1049l");

							// ── Lanzamos lazygit (bloqueante) ──
							// lazygit maneja su propio alternate screen internamente.
							spawnSync("lazygit", { stdio: "inherit" });

							// ── Re-entrada al alternate screen de OpenCode ──
							// Volvemos al alternate screen y limpiamos cualquier artefacto
							// que haya quedado del buffer anterior antes de que OpenTUI redibuje.
							process.stdout.write("\x1b[?1049h\x1b[2J\x1b[0;0H");

							// ── Restauramos la ruta original ──
							if (prevRoute.name === "session") {
								api.route.navigate("session", prevRoute.params);
							} else {
								api.route.navigate("home");
							}

							// ── Forzamos el redibujado del renderer si está disponible ──
							if (api.renderer && typeof api.renderer.requestRender === "function") {
								api.renderer.requestRender();
							}
						} catch (e) {
							api.route.navigate("home");
							api.ui.toast({
								title: "Error",
								message: "No se pudo ejecutar lazygit.",
								variant: "error",
							});
						}
					}, 50);
				} catch (e) {
					api.ui.toast({
						title: "Error",
						message: "Error al intentar validar el repositorio git.",
						variant: "error",
					});
				}
			},
		},
	]);

	// ─── Gestión de Plugins Internos ──────────────────────────────────────────
	/**
	 * Configura qué plugins de la barra lateral deben estar activos o inactivos
	 * para mantener una interfaz limpia y coherente con el estilo 'Mask'.
	 */
	const enableInternal = async () => {
		try {
			await api.plugins.deactivate("internal:sidebar-context");
			await api.plugins.deactivate("internal:sidebar-mcp");
			await api.plugins.activate("internal:sidebar-lsp");
			await api.plugins.activate("internal:sidebar-todo");
			await api.plugins.activate("internal:sidebar-files");
		} catch (e) {}
	};
	enableInternal();

	// ─── Limpieza al Salir ────────────────────────────────────────────────────
	/**
	 * Garantiza que cuando cierres OpenCode (/exit), la terminal se limpie
	 * y vuelva a su estado original sin dejar restos de la máscara.
	 */
	api.lifecycle.onDispose(() => {
		// \x1b[?1049l: Sale del búfer de pantalla alternativo (restaura historial previo)
		// \x1b[?25h: Se asegura de que el cursor sea visible al salir
		process.stdout.write("\x1b[?1049l\x1b[?25h");
	});

	// ─── Registro de Slots de la UI ──────────────────────────────────────────
	/**
	 * Define dónde y cómo se renderizan los componentes del plugin en la interfaz.
	 */
	api.slots.register({
		slots: {
			// Logo principal en la pantalla de bienvenida
			home_logo(ctx) {
				return <HomeLogo theme={ctx.theme.current} />;
			},
			// Barra de estado/detección en la parte inferior de la home
			home_bottom(ctx) {
				return (
					<DetectedEnv
						theme={ctx.theme.current}
						providers={api.state.provider}
						config={boot}
					/>
				);
			},
			// Contenido personalizado para la barra lateral (Sidebar)
			sidebar_content(ctx, value) {
				const sessionID = value?.session_id;
				return (
					<SidebarArch
						theme={ctx.theme.current}
						selectedTheme={api.theme.selected}
						config={boot}
						branch={api.state.vcs?.branch}
						getMessages={() =>
							sessionID ? api.state.session.messages(sessionID) : []
						}
						contextLimit={1000000}
					/>
				);
			},
			// ─── Limpieza del Home ──────────────────────────────────────────
			// Ocultamos el prompt y footer por defecto de OpenCode para mantener la estética Arch.
			home_prompt() {
				return null;
			},
			home_footer() {
				return null;
			},
			// Personalización del prompt en la sesión de chat
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
};

const plugin: TuiPluginModule & { id: string } = { id, tui };
export default plugin;
