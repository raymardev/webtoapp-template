import { useCallback, useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import * as SplashScreen from "expo-splash-screen";
import WebViewScreen from "./WebViewScreen";
import OfflineScreen from "./OfflineScreen";
import { config, isDarkBackground } from "./theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
	const [online, setOnline] = useState(true);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let active = true;
		let offlineTimer: ReturnType<typeof setTimeout> | null = null;

		const clearOfflineTimer = () => {
			if (offlineTimer) clearTimeout(offlineTimer);
			offlineTimer = null;
		};

		// Going offline is debounced so a momentary blip never covers the app; coming
		// back online is applied immediately.
		const apply = (isOnline: boolean) => {
			if (!active) return;
			clearOfflineTimer();
			if (isOnline) setOnline(true);
			else offlineTimer = setTimeout(() => active && setOnline(false), 2000);
		};

		const unsubscribe = NetInfo.addEventListener((state) => {
			// `isInternetReachable` is null until probed — only trust an explicit false.
			apply(state.isConnected !== false);
		});

		// Never leave the splash up on a failed probe: reveal the app either way and
		// let the WebView's own error screen handle a genuinely dead connection.
		const reveal = () => {
			if (!active) return;
			setReady(true);
			SplashScreen.hideAsync().catch(() => {});
		};

		NetInfo.fetch()
			.then((state) => {
				if (!active) return;
				setOnline(state.isConnected !== false);
			})
			.catch(() => {})
			.finally(reveal);

		return () => {
			active = false;
			clearOfflineTimer();
			unsubscribe();
		};
	}, []);

	const retry = useCallback(() => {
		NetInfo.fetch()
			.then((state) => setOnline(state.isConnected !== false))
			.catch(() => {});
	}, []);

	if (!ready) return null;

	return (
		<SafeAreaProvider>
			<StatusBar style={isDarkBackground ? "light" : "dark"} />
			<SafeAreaView
				style={[styles.safe, { backgroundColor: config.backgroundColor }]}
				edges={["top", "bottom"]}
			>
				{/* The WebView stays mounted and OfflineScreen covers it — unmounting would
				    throw away the page, scroll position and any half-filled form, which is
				    the opposite of what the offline screen promises the user. */}
				<WebViewScreen />
				{!online && <OfflineScreen onRetry={retry} />}
			</SafeAreaView>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
});
