import { useEffect } from "react";
import * as Linking from "expo-linking";
import { config } from "../theme";

/** Maps an incoming deep link / universal link to a URL on the client's web app. */
function toWebUrl(incoming: string): string | null {
	try {
		const parsed = Linking.parse(incoming);
		if (!parsed.path) return null;
		const base = config.url.replace(/\/$/, "");
		const query = parsed.queryParams
			? Object.entries(parsed.queryParams)
					.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
					.join("&")
			: "";
		return `${base}/${parsed.path}${query ? `?${query}` : ""}`;
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
