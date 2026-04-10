// ─── Arch Linux ASCII Art Assets ──────────────────────────────────────────────

// Zone colors
export const zoneColors = {
	neonBlue: "#00c8ff", // c1 — primary Arch cyan
	white: "#e0e0e0", // c2 — secondary white
	hotPink: "#ff2d78", // accent
	purple: "#9d4edd", // accent
} as const;

// ─── Home screen logo (compact Arch Linux with small "sombrerito") ───────────
//
// Compact Arch logo with two-tone coloring:
//   hotPink = main body
//   white = middle band
//
export const archLogoHome: string[] = [
	"                   -`                    ",
	"                  .o+`                   ",
	"                 `ooo/                   ",
	"                `+oooo:                  ",
	"               `+oooooo:                 ",
	"               -+oooooo+:                ",
	"             `/:-:++oooo+:               ",
	"            `/++++/+++++++:              ",
	"           `/+++++++++++++++:            ",
	"          `/+++ooooooooooooo/`           ",
	"         ./ooosssso++osssssso+`          ",
	"        .oossssso-````/ossssss+`         ",
	"       -osssssso.      :ssssssso.        ",
	"      :osssssss/        osssso+++.       ",
	"     /ossssssss/        +ssssooo/-       ",
	"   `/ossssso+/:-        -:/+osssso+-     ",
	"  `+sso+:-`                 `.-/+oso:    ",
	" `++:.                           `-+/    ",
	" .`                                 `/   ",
];

// Line-to-zone mapping: "hotPink" or "white"
export const homeLogoZones: ("hotPink" | "white")[] = [
	"hotPink", // line 0:  -`
	"hotPink", // line 1:  .o+`
	"hotPink", // line 2:  `ooo/
	"hotPink", // line 3:  `+oooo:
	"hotPink", // line 4:  `+oooooo:
	"hotPink", // line 5:  -+oooooo+:
	"hotPink", // line 6:  `/:-:++oooo+:
	"hotPink", // line 7:  `/++++/+++++++:
	"hotPink", // line 8:  `/+++++++++++++++:
	"white", // line 9:  `/+++ooooooooooooo/`
	"white", // line 10: ./ooosssso++osssssso+`
	"white", // line 11: .oossssso-````/ossssss+`
	"hotPink", // line 12: -osssssso.      :ssssssso.
	"hotPink", // line 13: :osssssss/        osssso+++.
	"hotPink", // line 14: /ossssssss/        +ssssooo/-
	"hotPink", // line 15: `/ossssso+/:-        -:/+osssso+-
	"hotPink", // line 16: `+sso+:-`                 `.-/+oso:
	"hotPink", // line 17: `++:.                           `-+/
	"hotPink", // line 18: .`                                 `/
];

// ─── Sidebar logo (mini Arch) ────────────────────────────────────────────────
export const archLogoSidebar: string[] = [
	"        /\\         ",
	"       /  \\        ",
	"      /    \\       ",
	"     /      \\      ",
	"    /   ,,   \\     ",
	"   /   |  |   \\    ",
	'  /   /-""-\\   \\  ',
	"/___/      \\___\\",
];

export const sidebarLogoZones: ("hotPink" | "white")[] = [
	"hotPink",
	"hotPink",
	"hotPink",
	"hotPink",
	"white",
	"white",
	"white",
	"hotPink",
];
