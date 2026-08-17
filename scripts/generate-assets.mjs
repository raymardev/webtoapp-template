// WebToApp Kit — asset generator.
//
// Takes ONE source logo and produces every store-standard asset, so a client
// never hand-crafts icons. Reads colors from client.config.js.
//
//   npm run assets                 # uses config.logo (default assets/logo.png)
//   npm run assets -- ./logo.png   # or pass a path
//
// Output (Expo then auto-generates every platform size from these at build):
//   assets/icon.png               1024×1024, opaque      (iOS + Android base)
//   assets/adaptive-icon.png      1024×1024, transparent (Android adaptive foreground)
//   assets/splash-icon.png        1024×1024, transparent (splash screen)
//   assets/notification-icon.png  96×96, white silhouette (Android status bar)
//   assets/favicon.png            48×48                  (web)
import { Jimp } from "jimp";
import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const config = require(join(ROOT, "client.config.js"));
const ASSETS = join(ROOT, "assets");

const src = resolve(ROOT, process.argv[2] || config.logo || "assets/logo.png");
if (!existsSync(src)) {
	console.error(`\n✗ No source logo at: ${src}`);
	console.error(`  Drop a square PNG (1024×1024 recommended) at assets/logo.png,`);
	console.error(`  or pass one:  npm run assets -- ./path/to/logo.png\n`);
	process.exit(1);
}

// "#RRGGBB" → 0xRRGGBBff (jimp uses RGBA ints)
const hexToInt = (hex) => {
	let h = String(hex || "#000000").replace("#", "");
	if (h.length === 3) h = h.split("").map((c) => c + c).join("");
	return ((parseInt(h.slice(0, 6), 16) << 8) >>> 0) + 0xff;
};
const BG = hexToInt(config.backgroundColor);
const TRANSPARENT = 0x00000000;
// How much of the icon the logo fills. 1 = full-bleed (for a finished/square logo
// that already has its own background); ~0.8 = padded on backgroundColor (for a bare symbol).
const ICON_SCALE = typeof config.iconScale === "number" ? config.iconScale : 0.8;

// Scale the logo to `scale` of `size`, centered on a `size`×`size` canvas filled with `fill`.
const compose = async (size, fill, scale, out, note) => {
	const logo = await Jimp.read(src);
	logo.scaleToFit({ w: Math.round(size * scale), h: Math.round(size * scale) });
	const canvas = new Jimp({ width: size, height: size, color: fill });
	canvas.composite(logo, Math.round((size - logo.bitmap.width) / 2), Math.round((size - logo.bitmap.height) / 2));
	await canvas.write(join(ASSETS, out));
	console.log(`✓ assets/${out.padEnd(20)} ${note}`);
};

console.log(`\nWebToApp Kit — generating assets from ${src}\n`);
await compose(1024, BG, ICON_SCALE, "icon.png", `1024×1024, opaque (logo scale ${ICON_SCALE})`);
await compose(1024, TRANSPARENT, 0.66, "adaptive-icon.png", "1024×1024, transparent (Android safe zone)");
await compose(1024, TRANSPARENT, 0.5, "splash-icon.png", "1024×1024, transparent (splash)");

// Android renders the status-bar notification icon as a flat silhouette: it keeps
// only the alpha channel and paints it white. Produce that shape ourselves so the
// system doesn't fall back to a featureless white square.
const notif = await Jimp.read(src);
notif.scaleToFit({ w: 72, h: 72 });

// A logo with no transparency has no silhouette to extract — every pixel is opaque,
// so the result is a solid white block. Say so instead of shipping a blank icon.
const alpha = notif.bitmap.data;
let opaquePixels = 0;
for (let i = 3; i < alpha.length; i += 4) if (alpha[i] > 16) opaquePixels++;
const opaqueRatio = opaquePixels / (alpha.length / 4);

notif.scan(0, 0, notif.bitmap.width, notif.bitmap.height, (x, y, idx) => {
	notif.bitmap.data[idx] = 255;
	notif.bitmap.data[idx + 1] = 255;
	notif.bitmap.data[idx + 2] = 255;
});
const notifCanvas = new Jimp({ width: 96, height: 96, color: TRANSPARENT });
notifCanvas.composite(
	notif,
	Math.round((96 - notif.bitmap.width) / 2),
	Math.round((96 - notif.bitmap.height) / 2),
);
await notifCanvas.write(join(ASSETS, "notification-icon.png"));
if (opaqueRatio > 0.95) {
	console.log(
		`⚠ assets/${"notification-icon.png".padEnd(20)} 96×96 — source logo has no transparency,`,
	);
	console.log(
		`  so this is a solid white block. Android will show a featureless square on every`,
	);
	console.log(
		`  notification. Supply a logo with a transparent background, or hand-draw a white-on-`,
	);
	console.log(`  transparent 96×96 at assets/notification-icon.png.`);
} else {
	console.log(
		`✓ assets/${"notification-icon.png".padEnd(20)} 96×96, white silhouette (Android status bar)`,
	);
}

const fav = await Jimp.read(src);
fav.scaleToFit({ w: 48, h: 48 });
await fav.write(join(ASSETS, "favicon.png"));
console.log(`✓ assets/${"favicon.png".padEnd(20)} 48×48 (web)`);

console.log(`\nDone. Next:  npm run validate  →  eas build\n`);
