export type WebToAppFeatures = {
	/** Register for and receive push notifications (expo-notifications). */
	push: boolean;
	/** Expose native share via the window.WebToAppBridge bridge. */
	share: boolean;
	/**
	 * Pull down on the WebView to reload. **iOS only** — react-native-webview's
	 * `pullToRefreshEnabled` is an iOS prop, so this is a no-op on Android.
	 */
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
	/** Marketing version (iOS CFBundleShortVersionString / Android versionName). Bump per store release. Default "1.0.0". */
	version?: string;
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
	/**
	 * Extra hosts that must stay INSIDE the app instead of opening in the system
	 * browser. Anything not on `url`'s host is treated as an external link, which
	 * breaks flows that navigate away and come back — OAuth sign-in, hosted
	 * checkout. List those hosts here, e.g.
	 * `["accounts.google.com", "checkout.stripe.com", "www.acme.com"]`.
	 */
	allowedHosts?: string[];
	/** Toggle native capabilities. */
	features: WebToAppFeatures;
	/**
	 * Path to the Firebase `google-services.json` for this app. **Required for
	 * Android push** — without it the Android build has no FCM credentials and
	 * `getExpoPushTokenAsync` fails. Not needed if `features.push` is off.
	 */
	androidGoogleServicesFile?: string;
	/** EAS project id (filled after `eas init`). */
	eas?: { projectId?: string };
};
