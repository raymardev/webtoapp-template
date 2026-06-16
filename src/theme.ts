import Constants from "expo-constants";
import type { WebToAppFeatures } from "./webtoapp.types";

type Extra = {
	shipUrl?: string;
	primaryColor?: string;
	backgroundColor?: string;
	features?: WebToAppFeatures;
	eas?: { projectId?: string };
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Runtime config, read from app.config.ts `extra` (which comes from client.config.ts). */
export const config = {
	url: extra.shipUrl ?? "https://docs.expo.dev",
	primaryColor: extra.primaryColor ?? "#00d08c",
	backgroundColor: extra.backgroundColor ?? "#050a18",
	features: extra.features ?? { push: true, share: true, pullToRefresh: true },
	projectId: extra.eas?.projectId,
};
