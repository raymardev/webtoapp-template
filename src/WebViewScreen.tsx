import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform, Share, StyleSheet, View } from "react-native";
import {
	WebView,
	type WebViewMessageEvent,
	type WebViewNavigation,
} from "react-native-webview";

/** Shape of the onOpenWindow event (not re-exported from the package root). */
type OpenWindowEvent = { nativeEvent: { targetUrl: string } };
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { config } from "./theme";
import LoadingScreen from "./components/LoadingScreen";
import ErrorScreen from "./components/ErrorScreen";
import { INJECTED_BRIDGE, parseBridgeMessage, pushTokenScript } from "./native/bridge";
import { registerForPushNotifications, subscribeToNotificationTaps } from "./native/push";
import { useDeepLink } from "./native/linking";

const BASE_HOST = (() => {
	try {
		return new URL(config.url).host;
	} catch {
		return "";
	}
})();

/**
 * Whether a URL should stay inside the app rather than open in the system browser.
 *
 * The client's own host, plus any host the founder listed in `allowedHosts` — an
 * OAuth provider or hosted checkout navigates off-host and back, and ejecting it to
 * Safari strands the user outside the app mid-flow.
 */
function isInternal(url: string): boolean {
	try {
		const { host } = new URL(url);
		return host === BASE_HOST || config.allowedHosts.includes(host);
	} catch {
		return false;
	}
}

export default function WebViewScreen() {
	const webRef = useRef<WebView>(null);
	const pushTokenRef = useRef<string | null>(null);
	const [uri, setUri] = useState(config.url);
	const uriRef = useRef(config.url);
	const [loading, setLoading] = useState(true);
	const [errored, setErrored] = useState(false);
	const [canGoBack, setCanGoBack] = useState(false);

	// The URL actually on screen, which drifts from `uri` as the user browses.
	// Retrying after an error must return here, not to the entry page.
	const currentUrlRef = useRef(config.url);

	// Deep / universal links → navigate the WebView.
	const navigateTo = useCallback((url: string) => {
		setErrored(false);
		setLoading(true);
		// Re-opening the URL already in state changes nothing, so no load would start
		// and the spinner would never clear. Reload imperatively instead.
		if (uriRef.current === url) {
			webRef.current?.reload();
			return;
		}
		uriRef.current = url;
		setUri(url);
	}, []);
	useDeepLink(navigateTo);

	// Tapping a push notification with a `data.url` → open that route.
	useEffect(() => {
		if (!config.features.push) return;
		return subscribeToNotificationTaps(navigateTo);
	}, [navigateTo]);

	// Android hardware back → WebView history.
	useEffect(() => {
		if (Platform.OS !== "android") return;
		const onBack = () => {
			if (canGoBack && webRef.current) {
				webRef.current.goBack();
				return true;
			}
			return false;
		};
		const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
		return () => sub.remove();
	}, [canGoBack]);

	// Push registration → forward token to the web app.
	useEffect(() => {
		if (!config.features.push) return;
		let active = true;
		registerForPushNotifications().then((token) => {
			if (!active || !token) return;
			pushTokenRef.current = token;
			webRef.current?.injectJavaScript(pushTokenScript(token));
		});
		return () => {
			active = false;
		};
	}, []);

	const reload = useCallback(() => {
		setErrored(false);
		setLoading(true);
		// While errored the WebView is unmounted, so `reload()` on the ref is a no-op —
		// remount it pointed at the page the user was actually on.
		const target = currentUrlRef.current;
		if (target !== uriRef.current) {
			uriRef.current = target;
			setUri(target);
		} else {
			webRef.current?.reload();
		}
	}, []);

	const onMessage = useCallback((event: WebViewMessageEvent) => {
		const msg = parseBridgeMessage(event.nativeEvent.data);
		if (!msg) return;
		if (msg.type === "share" && config.features.share) {
			const p = msg.payload as { title?: string; message?: string; url?: string };
			Share.share({ message: p.message ?? p.url ?? "", title: p.title, url: p.url }).catch(() => {});
		} else if (msg.type === "setBadge") {
			const p = msg.payload as { count?: number };
			Notifications.setBadgeCountAsync(p.count ?? 0).catch(() => {});
		}
	}, []);

	// Open external links and non-web schemes (mailto:, tel:) in the system browser.
	// Only ever act on the TOP frame — iframes/subresources (analytics, reCAPTCHA,
	// payment embeds) must load inside the WebView, never be kicked out to Safari.
	const onShouldStart = useCallback((request: { url: string; isTopFrame?: boolean }) => {
		const { url, isTopFrame } = request;
		if (isTopFrame === false) return true;
		if (url.startsWith("http://") || url.startsWith("https://")) {
			let host: string;
			try {
				host = new URL(url).host;
			} catch {
				return true; // unparseable — leave it to the WebView rather than eject it
			}
			if (host !== BASE_HOST && !config.allowedHosts.includes(host)) {
				Linking.openURL(url).catch(() => {});
				return false;
			}
			return true;
		}
		Linking.openURL(url).catch(() => {});
		return false;
	}, []);

	// `target="_blank"` links never reach onShouldStartLoadWithRequest on Android, so
	// without this they silently do nothing. Keep our own pages in the WebView and
	// send everything else to the system browser.
	const onOpenWindow = useCallback((event: OpenWindowEvent) => {
		const url = event.nativeEvent.targetUrl;
		if (!url) return;
		if (isInternal(url)) {
			navigateTo(url);
		} else {
			Linking.openURL(url).catch(() => {});
		}
	}, [navigateTo]);

	const onNavStateChange = useCallback((nav: WebViewNavigation) => {
		setCanGoBack(nav.canGoBack);
		if (nav.url && nav.url !== "about:blank") currentUrlRef.current = nav.url;
	}, []);

	const onLoadEnd = useCallback(() => {
		setLoading(false);
		if (pushTokenRef.current) {
			webRef.current?.injectJavaScript(pushTokenScript(pushTokenRef.current));
		}
	}, []);

	// The WebView's own renderer process can be killed under memory pressure. Without
	// handling it the user is left staring at a permanently blank screen.
	const onProcessLost = useCallback(() => {
		setLoading(false);
		setErrored(true);
		return true;
	}, []);

	if (errored) {
		return (
			<ErrorScreen
				emoji="⚠️"
				title="Something went wrong"
				subtitle="We couldn't load the app. Please try again."
				onRetry={reload}
			/>
		);
	}

	return (
		<View style={styles.container}>
			<WebView
				ref={webRef}
				source={{ uri }}
				// Defined before page scripts run, so the web app can use the bridge
				// immediately; re-injected after load as a safety net (it is idempotent).
				injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
				injectedJavaScript={INJECTED_BRIDGE}
				onMessage={onMessage}
				onNavigationStateChange={onNavStateChange}
				onShouldStartLoadWithRequest={onShouldStart}
				onOpenWindow={onOpenWindow}
				onLoadEnd={onLoadEnd}
				onError={() => setErrored(true)}
				onRenderProcessGone={onProcessLost}
				onContentProcessDidTerminate={onProcessLost}
				pullToRefreshEnabled={config.features.pullToRefresh}
				allowsBackForwardNavigationGestures
				startInLoadingState={false}
				// Match how the site already behaves in a browser: video plays inline
				// instead of being forced into a fullscreen native player, and autoplay
				// (which a WebView blocks by default, even when muted) is allowed.
				allowsInlineMediaPlayback
				mediaPlaybackRequiresUserAction={false}
				// Let the web app use getUserMedia (camera/mic) without a second prompt
				// on iOS once the OS-level permission has been granted.
				mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
				style={{ backgroundColor: config.backgroundColor }}
			/>
			{loading && <LoadingScreen />}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: config.backgroundColor },
});
