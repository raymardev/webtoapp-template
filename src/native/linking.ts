import { useEffect } from "react";
import * as Linking from "expo-linking";
import { config } from "../theme";

/** Maps an incoming deep link / universal link to a URL on the client's web app. */
function toWebUrl(incoming: string): string | null {
	try {
		const parsed = Linking.parse(incoming);
		const base = config.url.replace(/\/$/, "");
		// A bare `acme://` or a link to the domain root has no path — that's the home
		// route, not an unmappable link, so don't drop it.
		const path = parsed.path ? `/${parsed.path.replace(/^\//, "")}` : "";
		const params: string[] = [];
		for (const [k, v] of Object.entries(parsed.queryParams ?? {})) {
			if (v == null) continue;
			// A repeated key parses to an array — preserve every value.
			for (const one of Array.isArray(v) ? v : [v]) {
				params.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(one))}`);
			}
		}
		const query = params.join("&");
		return `${base}${path}${query ? `?${query}` : ""}`;
	} catch {
		return null;
	}
}

/** Calls `onUrl` with a web URL whenever the app is opened via a deep/universal link. */
export function useDeepLink(onUrl: (url: string) => void): void {
	useEffect(() => {
		let active = true;

		Linking.getInitialURL().then((initial) => {
			if (!active || !initial) return;
			const mapped = toWebUrl(initial);
			if (mapped) onUrl(mapped);
		});

		const sub = Linking.addEventListener("url", ({ url }) => {
			const mapped = toWebUrl(url);
			if (mapped) onUrl(mapped);
		});

		return () => {
			active = false;
			sub.remove();
		};
	}, [onUrl]);
}
