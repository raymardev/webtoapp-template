/**
 * Web ↔ native bridge.
 *
 * The injected script exposes `window.WebToAppBridge` to the client's web app so it
 * can trigger native capabilities. The web app never has to know it's wrapped —
 * but if it wants native share / badges / push, these hooks are here.
 */

export const INJECTED_BRIDGE = `
(function () {
  if (window.WebToAppBridge) return;
  function send(type, payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || {} }));
    }
  }
  window.WebToAppBridge = {
    share: function (data) { send('share', data); },
    setBadge: function (count) { send('setBadge', { count: count }); },
    ready: function () { send('ready', {}); },
  };
  window.dispatchEvent(new Event('WebToAppBridgeReady'));
})();
true;
`;

export type BridgeMessage =
	| { type: "share"; payload: { title?: string; message?: string; url?: string } }
	| { type: "setBadge"; payload: { count: number } }
	| { type: "ready"; payload: Record<string, never> }
	| { type: string; payload: unknown };

export function parseBridgeMessage(raw: string): BridgeMessage | null {
	try {
		const data = JSON.parse(raw) as { type?: unknown; payload?: unknown };
		if (data && typeof data.type === "string") {
			return { type: data.type, payload: data.payload } as BridgeMessage;
		}
		return null;
	} catch {
		return null;
	}
}

/** Pushes the Expo push token into the web app via a CustomEvent it can listen for. */
export function pushTokenScript(token: string): string {
	return `window.dispatchEvent(new CustomEvent('ShipPushToken', { detail: ${JSON.stringify(
		token,
	)} })); true;`;
}
