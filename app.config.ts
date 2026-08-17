import type { ExpoConfig } from "expo/config";
import client from "./client.config";

/**
 * Generates the full Expo config from client.config.js.
 * You normally never touch this file — edit client.config.js instead.
 */
// Pro / Autopilot: over-the-air JS updates — only when enabled and a project id is set.
const otaConfig: Partial<ExpoConfig> =
	client.features.ota && client.eas?.projectId
		? {
			updates: { url: `https://u.expo.dev/${client.eas.projectId}` },
			runtimeVersion: { policy: "appVersion" },
		}
		: {};

const config: ExpoConfig = {
	name: client.name,
	slug: client.slug,
	scheme: client.scheme,
	version: "1.0.0",
	orientation: "portrait",
	icon: "./assets/icon.png",
	userInterfaceStyle: "automatic",
	ios: {
		bundleIdentifier: client.bundleId,
		supportsTablet: true,
		associatedDomains: client.associatedDomains.map((d) => `applinks:${d}`),
		infoPlist: {
			// A WebView wrapper only uses HTTPS/standard crypto, so this is exempt.
			// Declaring it here answers App Store Connect's export-compliance question
			// automatically instead of once per submission.
			ITSAppUsesNonExemptEncryption: false,
		},
	},
	android: {
		package: client.bundleId,
		adaptiveIcon: {
			foregroundImage: "./assets/adaptive-icon.png",
			backgroundColor: client.backgroundColor,
		},
		intentFilters: client.associatedDomains.map((domain) => ({
			action: "VIEW",
			autoVerify: true,
			data: [{ scheme: "https", host: domain }],
			category: ["BROWSABLE", "DEFAULT"],
		})),
	},
	web: {
		favicon: "./assets/favicon.png",
	},
	plugins: [
		[
			"expo-splash-screen",
			{
				image: "./assets/splash-icon.png",
				imageWidth: 200,
				resizeMode: "contain",
				backgroundColor: client.backgroundColor,
			},
		],
		[
			"expo-notifications",
			{
				// Android draws the status-bar notification icon as a silhouette. Without
				// a dedicated white-on-transparent icon it falls back to the app icon and
				// usually renders as a featureless white square.
				icon: "./assets/notification-icon.png",
				color: client.primaryColor,
			},
		],
	],
	extra: {
		url: client.url,
		primaryColor: client.primaryColor,
		backgroundColor: client.backgroundColor,
		features: client.features,
		eas: client.eas ?? {},
	},
	...otaConfig,
};

export default config;
