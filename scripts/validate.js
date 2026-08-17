#!/usr/bin/env node
/**
 * WebToApp Kit pre-flight validator.
 *
 * Checks that client.config.js is complete and well-formed, and runs an Apple
 * App Store Guideline 4.2 readiness check (refuses a bare WebView with no
 * native features — that's what Apple rejects).
 *
 * Usage: `npm run validate`  (or `node scripts/validate.js`)
 * Exit code: 0 = ready to build, 1 = blocking errors. Designed as a gate an
 * AI agent or CI can rely on before running `eas build`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/** @type {string[]} */ const errors = [];
/** @type {string[]} */ const warnings = [];
/** @type {string[]} */ const oks = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const ok = (m) => oks.push(m);

let config;
try {
	config = require(path.join(ROOT, "client.config.js"));
} catch (e) {
	console.error("✗ Could not load client.config.js:", e instanceof Error ? e.message : e);
	process.exit(1);
}

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const BUNDLE = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9-]*)+$/; // reverse-DNS, 2+ segments
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SCHEME = /^[a-z][a-z0-9+.-]*$/;

// Template defaults — present means "not configured yet for this client".
const DEFAULTS = {
	name: "WebToApp Demo",
	slug: "webtoapp-demo",
	bundleId: "com.webtoapp.demo",
	scheme: "webtoappdemo",
	url: "https://docs.expo.dev",
};

// --- name ---
if (!isStr(config.name)) err("name is required");
else if (config.name === DEFAULTS.name) warn(`name is still the template default ("${DEFAULTS.name}")`);
else ok(`name: ${config.name}`);

// --- slug ---
if (!isStr(config.slug)) err("slug is required");
else if (!SLUG.test(config.slug)) err(`slug must be lowercase with dashes (got "${config.slug}")`);
else if (config.slug === DEFAULTS.slug) warn(`slug is still the template default ("${DEFAULTS.slug}")`);
else ok(`slug: ${config.slug}`);

// --- bundleId (immutable after first submit) ---
if (!isStr(config.bundleId)) err("bundleId is required");
else if (!BUNDLE.test(config.bundleId)) err(`bundleId must be reverse-DNS like com.acme.app (got "${config.bundleId}")`);
else if (config.bundleId === DEFAULTS.bundleId) warn(`bundleId is still the template default ("${DEFAULTS.bundleId}") — it is IMMUTABLE after first submit, set it now`);
else ok(`bundleId: ${config.bundleId}`);

// --- scheme ---
if (!isStr(config.scheme)) err("scheme is required");
else if (!SCHEME.test(config.scheme)) err(`scheme must be a URL scheme (lowercase, no spaces/colon), got "${config.scheme}"`);
else if (config.scheme === DEFAULTS.scheme) warn(`scheme is still the template default ("${DEFAULTS.scheme}")`);
else ok(`scheme: ${config.scheme}://`);

// --- url ---
if (!isStr(config.url)) {
	err("url is required");
} else {
	let u = null;
	try { u = new URL(config.url); } catch { /* invalid */ }
	if (!u) err(`url is not a valid URL (got "${config.url}")`);
	else if (u.protocol !== "https:") err(`url must be https:// (got "${u.protocol}//")`);
	else if (config.url === DEFAULTS.url || u.host === "docs.expo.dev") warn(`url is still the template default ("${DEFAULTS.url}")`);
	else ok(`url: ${config.url}`);
}

// --- colors ---
for (const key of ["primaryColor", "backgroundColor"]) {
	if (!isStr(config[key])) err(`${key} is required`);
	else if (!HEX.test(config[key])) err(`${key} must be a hex color like #00d08c (got "${config[key]}")`);
	else ok(`${key}: ${config[key]}`);
}

// --- associatedDomains (universal links) ---
let validDomains = 0;
if (!Array.isArray(config.associatedDomains)) {
	err("associatedDomains must be an array (use [] if none)");
} else {
	for (const d of config.associatedDomains) {
		if (typeof d !== "string") err(`associatedDomains entries must be strings (got ${typeof d})`);
		else if (/^https?:\/\//.test(d)) err(`associatedDomains must NOT include the protocol (got "${d}") — use just the host, e.g. app.acme.com`);
		else if (d.includes("/")) err(`associatedDomains must be a bare host with no path (got "${d}")`);
		else { ok(`universal link domain: ${d}`); validDomains++; }
	}
}

// --- features ---
const f = config.features || {};
for (const key of ["push", "share", "pullToRefresh"]) {
	if (typeof f[key] !== "boolean") err(`features.${key} must be true or false`);
}

// --- optional features ---
if (f.ota !== undefined && typeof f.ota !== "boolean") err("features.ota must be true or false when set");

// --- logo / iconScale ---
if (config.logo !== undefined && !isStr(config.logo)) err("logo must be a path string when set");
if (config.iconScale !== undefined) {
	if (typeof config.iconScale !== "number" || Number.isNaN(config.iconScale)) {
		err(`iconScale must be a number (got ${typeof config.iconScale})`);
	} else if (config.iconScale <= 0 || config.iconScale > 1) {
		err(`iconScale must be between 0 and 1 (got ${config.iconScale})`);
	} else {
		ok(`iconScale: ${config.iconScale}`);
	}
}

// --- eas.projectId (needed for push) ---
const projectId = config.eas && config.eas.projectId;
if (f.push === true && !isStr(projectId)) {
	warn("features.push is on but eas.projectId is empty — run `eas init` and paste the projectId, or push won't work");
}
// OTA silently produces no `updates` config without a projectId — fail loudly instead.
if (f.ota === true && !isStr(projectId)) {
	err("features.ota is on but eas.projectId is empty — OTA updates would be silently disabled. Run `eas init` and paste the projectId.");
}

// --- Apple Guideline 4.2 readiness ---
const hasLinks = validDomains > 0;
const nativeSignals = [
	f.push === true && "push",
	f.share === true && "share",
	hasLinks && "universal links",
].filter(Boolean);

if (nativeSignals.length === 0) {
	err("4.2 readiness: no native features enabled (push/share/universal links all off). This is a bare WebView — Apple will likely reject it under Guideline 4.2. Enable at least push.");
} else if (f.push !== true) {
	warn(`4.2 readiness: push is off. Native signals present: ${nativeSignals.join(", ")}. Push is the strongest 4.2 signal — turning it on is recommended.`);
} else {
	ok(`4.2 readiness: native signals — ${nativeSignals.join(", ")}`);
}

// --- asset standards ---
// Minimal PNG header reader (no deps): width/height live in the IHDR chunk.
function pngSize(file) {
	const buf = Buffer.alloc(24);
	const fd = fs.openSync(file, "r");
	try { fs.readSync(fd, buf, 0, 24, 0); } finally { fs.closeSync(fd); }
	if (buf[0] !== 0x89 || buf.toString("ascii", 1, 4) !== "PNG") return null;
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * How solidly filled the visible part of an 8-bit RGBA PNG is: the fraction of its
 * alpha bounding box that is non-transparent. ~1 means the artwork is a featureless
 * rectangle. Measuring the bounding box rather than the whole canvas makes this
 * independent of however much transparent padding surrounds the logo.
 *
 * Returns null if the file isn't a form we can read (interlaced, palette, 16-bit —
 * none of which we generate). Hand-rolled so this script stays dependency-free.
 */
function opaqueRatio(file) {
	try {
		const buf = fs.readFileSync(file);
		if (buf.readUInt32BE(0) !== 0x89504e47) return null;

		let pos = 8;
		let width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = 0;
		const idat = [];
		while (pos + 8 <= buf.length) {
			const len = buf.readUInt32BE(pos);
			const type = buf.toString("ascii", pos + 4, pos + 8);
			const data = buf.subarray(pos + 8, pos + 8 + len);
			if (type === "IHDR") {
				width = data.readUInt32BE(0);
				height = data.readUInt32BE(4);
				bitDepth = data[8];
				colorType = data[9];
				interlace = data[12];
			} else if (type === "IDAT") idat.push(data);
			else if (type === "IEND") break;
			pos += 12 + len;
		}
		// Only the plain 8-bit RGBA, non-interlaced form we produce.
		if (colorType !== 6 || bitDepth !== 8 || interlace !== 0 || !width || !height) return null;

		const raw = require("node:zlib").inflateSync(Buffer.concat(idat));
		const bpp = 4;
		const stride = width * bpp;
		const out = Buffer.alloc(height * stride);

		// Undo the per-scanline PNG filters (spec 9.2).
		for (let y = 0; y < height; y++) {
			const filter = raw[y * (stride + 1)];
			const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
			const cur = out.subarray(y * stride, y * stride + stride);
			const prior = y > 0 ? out.subarray((y - 1) * stride, (y - 1) * stride + stride) : null;
			for (let x = 0; x < stride; x++) {
				const a = x >= bpp ? cur[x - bpp] : 0;
				const b = prior ? prior[x] : 0;
				const c = prior && x >= bpp ? prior[x - bpp] : 0;
				let v = src[x];
				if (filter === 1) v += a;
				else if (filter === 2) v += b;
				else if (filter === 3) v += (a + b) >> 1;
				else if (filter === 4) {
					const p = a + b - c;
					const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
					v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
				} else if (filter !== 0) return null;
				cur[x] = v & 0xff;
			}
		}

		let opaque = 0, minX = width, minY = height, maxX = -1, maxY = -1;
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				if (out[y * stride + x * bpp + 3] <= 16) continue;
				opaque++;
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
		if (maxX < 0) return 0; // fully transparent
		return opaque / ((maxX - minX + 1) * (maxY - minY + 1));
	} catch {
		return null;
	}
}

const checkAsset = (rel, { square1024 = false } = {}) => {
	const p = path.join(ROOT, rel);
	if (!fs.existsSync(p)) { err(`missing ${rel} — run \`npm run assets\``); return; }
	const size = pngSize(p);
	if (!size) { err(`${rel} is not a valid PNG`); return; }
	if (square1024 && (size.width !== 1024 || size.height !== 1024)) {
		err(`${rel} must be 1024×1024 for store standards (got ${size.width}×${size.height}) — run \`npm run assets\``);
	} else {
		ok(`asset: ${rel} (${size.width}×${size.height})`);
	}
};

checkAsset("assets/icon.png", { square1024: true });
checkAsset("assets/adaptive-icon.png", { square1024: true });
checkAsset("assets/splash-icon.png");
checkAsset("assets/notification-icon.png");
checkAsset("assets/favicon.png");

// Android paints the notification icon from its alpha channel alone, so a fully
// opaque one renders as a blank white square on every notification. Catch that here
// rather than after the first push lands in front of real users.
const notifPath = path.join(ROOT, "assets/notification-icon.png");
if (fs.existsSync(notifPath)) {
	const ratio = opaqueRatio(notifPath);
	if (ratio !== null && ratio > 0.95) {
		warn(
			"assets/notification-icon.png is fully opaque — Android will show a blank white square on every notification. Use a logo with a transparent background, or hand-draw a white-on-transparent 96×96.",
		);
	}
}

// --- report ---
const C = { green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", reset: "\x1b[0m" };
console.log("\nWebToApp Kit — pre-flight\n");
for (const m of oks) console.log(`${C.green}✓${C.reset} ${m}`);
for (const m of warnings) console.log(`${C.yellow}⚠${C.reset} ${m}`);
for (const m of errors) console.log(`${C.red}✗${C.reset} ${m}`);
console.log("");

if (errors.length) {
	console.log(`${C.red}${errors.length} blocking issue(s)${C.reset}${warnings.length ? `, ${warnings.length} warning(s)` : ""}. Fix client.config.js and re-run.`);
	process.exit(1);
}
console.log(`${C.green}Ready to build.${C.reset}${warnings.length ? ` ${C.yellow}${warnings.length} warning(s)${C.reset} — review above.` : ""}`);
process.exit(0);
