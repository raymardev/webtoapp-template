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
	name: "Ship Demo",
	slug: "ship-demo",
	bundleId: "com.shiptostores.demo",
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

// --- eas.projectId (needed for push) ---
const projectId = config.eas && config.eas.projectId;
if (f.push === true && !isStr(projectId)) {
	warn("features.push is on but eas.projectId is empty — run `eas init` and paste the projectId, or push won't work");
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
checkAsset("assets/favicon.png");

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
