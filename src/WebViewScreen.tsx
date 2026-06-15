import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform, Share, StyleSheet, View } from "react-native";
import {
	WebView,
	type WebViewMessageEvent,
	type WebViewNavigation,
} from "react-native-webview";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { config } from "./theme";
import LoadingScreen from "./components/LoadingScreen";
import ErrorScreen from "./components/ErrorScreen";
import { INJECTED_BRIDGE, parseBridgeMessage, pushTokenScript } from "./native/bridge";
import { registerForPushNotifications } from "./native/push";
import { useDeepLink } from "./native/linking";

const BASE_HOST = (() => {
	try {
		return new URL(config.url).host;
	} catch {
		return "";
	}
})();

export default function WebViewScreen() {
	const webRef = useRef<WebView>(null);
	const pushTokenRef = useRef<string | null>(null);
	const [uri, setUri] = useState(config.url);
	const [loading, setLoading] = useState(true);
	const [errored, setErrored] = useState(false);
	const [canGoBack, setCanGoBack] = useState(false);

	// Deep / universal links → navigate the WebView.
	const onDeepLink = useCallback((url: string) => {
		setErrored(false);
		setUri(url);
	}, []);
	useDeepLink(onDeepLink);

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
		webRef.current?.reload();
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
			try {
				if (new URL(url).host !== BASE_HOST) {
					Linking.openURL(url).catch(() => {});
					return false;
				}
			} catch {
				return true;
			}
			return true;
		}
		Linking.openURL(url).catch(() => {});
		return false;
	}, []);

	const onNavStateChange = useCallback((nav: WebViewNavigation) => {
		setCanGoBack(nav.canGoBack);
	}, []);

	const onLoadEnd = useCallback(() => {
		setLoading(false);
		if (pushTokenRef.current) {
			webRef.current?.injectJavaScript(pushTokenScript(pushTokenRef.current));
		}
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
				injectedJavaScript={INJECTED_BRIDGE}
				onMessage={onMessage}
				onNavigationStateChange={onNavStateChange}
				onShouldStartLoadWithRequest={onShouldStart}
				onLoadEnd={onLoadEnd}
				onError={() => setErrored(true)}
				pullToRefreshEnabled={config.features.pullToRefresh}
				allowsBackForwardNavigationGestures
				startInLoadingState={false}
				style={{ backgroundColor: config.backgroundColor }}
			/>
			{loading && <LoadingScreen />}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: config.backgroundColor },
});
