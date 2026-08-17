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

		const unsubscribe = NetInfo.addEventListener((state) => {
			// `isInternetReachable` is null until probed — only trust an explicit false.
			setOnline(state.isConnected !== false);
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
				{online ? <WebViewScreen /> : <OfflineScreen onRetry={retry} />}
			</SafeAreaView>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1 },
});
