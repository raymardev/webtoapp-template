export type ShipFeatures = {
	/** Register for and receive push notifications (expo-notifications). */
	push: boolean;
	/** Expose native share via the window.ShipBridge bridge. */
	share: boolean;
	/** Pull down on the WebView to reload. */
	pullToRefresh: boolean;
	/** Over-the-air JS updates via expo-updates (Pro / Autopilot). Requires eas.projectId. */
	ota?: boolean;
};

export type ClientConfig = {
	/** Display name shown under the icon. */
	name: string;
	/** URL-safe project slug (lowercase, dashes). */
	slug: string;
	/** iOS bundle identifier / Android package, e.g. com.acme.app */
	bundleId: string;
	/** Custom URL scheme for deep links, e.g. "acme" -> acme:// */
	scheme: string;
	/** The web app the wrapper loads. */
	url: string;
	/** Source logo for `npm run assets` (square PNG, 1024×1024 recommended). */
	logo?: string;
	/** Icon fill: 1 = full-bleed (finished/square logo), ~0.8 = padded on bg (bare symbol). Default 0.8. */
	iconScale?: number;
	/** Brand accent colour (loaders, pull-to-refresh spinner). */
	primaryColor: string;
	/** App background / splash colour. */
	backgroundColor: string;
	/** Domains for iOS universal links + Android app links (no protocol). */
	associatedDomains: string[];
	/** Toggle native capabilities. */
	features: ShipFeatures;
	/** EAS project id (filled after `eas init`). */
	eas?: { projectId?: string };
};
