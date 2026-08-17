// @ts-check

/**
 * ┌──────────────────────────────────────────────────────────────┐
 * │  THE ONLY FILE YOU EDIT PER CLIENT.                           │
 * │  Change these values, drop your logo at assets/logo.png, run  │
 * │  `npm run assets`, then `eas build` + `eas submit`.           │
 * └──────────────────────────────────────────────────────────────┘
 *
 * @type {import("./src/webtoapp.types").ClientConfig}
 */
const config = {
	name: "WebToApp Demo",
	slug: "webtoapp-demo",
	bundleId: "com.webtoapp.demo",
	scheme: "webtoappdemo",
	url: "https://docs.expo.dev",
	version: "1.0.0",
	logo: "./assets/logo.png",
	primaryColor: "#00d08c",
	backgroundColor: "#050a18",
	associatedDomains: [],
	// Hosts that must stay in-app rather than open in the system browser —
	// OAuth providers, hosted checkout. e.g. "accounts.google.com".
	allowedHosts: [],
	features: {
		push: true,
		share: true,
		pullToRefresh: true,
	},
	eas: {},
};

module.exports = config;
