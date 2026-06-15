// @ts-check

/**
 * ┌──────────────────────────────────────────────────────────────┐
 * │  THE ONLY FILE YOU EDIT PER CLIENT.                           │
 * │  Change these values, drop your logo at assets/logo.png, run  │
 * │  `npm run assets`, then `eas build` + `eas submit`.           │
 * └──────────────────────────────────────────────────────────────┘
 *
 * @type {import("./src/ship.types").ClientConfig}
 */
const config = {
	name: "Ship Demo",
	slug: "ship-demo",
	bundleId: "com.shiptostores.demo",
	scheme: "shipdemo",
	url: "https://docs.expo.dev",
	logo: "./assets/logo.png",
	primaryColor: "#00d08c",
	backgroundColor: "#050a18",
	associatedDomains: [],
	features: {
		push: true,
		share: true,
		pullToRefresh: true,
	},
	eas: {},
};

module.exports = config;
