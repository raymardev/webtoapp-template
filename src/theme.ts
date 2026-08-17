import Constants from "expo-constants";
import type { WebToAppFeatures } from "./webtoapp.types";

type Extra = {
	url?: string;
	primaryColor?: string;
	backgroundColor?: string;
	features?: WebToAppFeatures;
	eas?: { projectId?: string };
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Runtime config, read from app.config.ts `extra` (which comes from client.config.js). */
export const config = {
	url: extra.url ?? "https://docs.expo.dev",
	primaryColor: extra.primaryColor ?? "#00d08c",
	backgroundColor: extra.backgroundColor ?? "#050a18",
	features: extra.features ?? { push: true, share: true, pullToRefresh: true },
	projectId: extra.eas?.projectId,
};

/** Relative luminance of a #rgb / #rrggbb colour (0 = black, 1 = white). */
function luminance(hex: string): number {
	let h = hex.replace("#", "");
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	const n = parseInt(h.slice(0, 6), 16);
	if (Number.isNaN(n)) return 0;
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	// Perceived brightness (ITU-R BT.601) — good enough to pick light vs dark text.
	return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

/**
 * Whether the configured background is dark. Drives status-bar style and text colour
 * so a client with a light `backgroundColor` doesn't get invisible white-on-white text.
 */
export const isDarkBackground = luminance(config.backgroundColor) < 0.5;

/** Foreground colours that stay readable on the configured background. */
export const foreground = {
	primary: isDarkBackground ? "#ffffff" : "#111827",
	secondary: isDarkBackground ? "#9ca3af" : "#4b5563",
};
