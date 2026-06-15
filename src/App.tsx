import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import * as SplashScreen from "expo-splash-screen";
import WebViewScreen from "./WebViewScreen";
import OfflineScreen from "./OfflineScreen";
import { config } from "./theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
	const [online, setOnline] = useState(true);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const unsubscribe = NetInfo.addEventListener((state) => {
			setOnline(state.isConnected !== false);
		});
		NetInfo.fetch().then((state) => {
			setOnline(state.isConnected !== false);
			setReady(true);
			SplashScreen.hideAsync().catch(() => {});
		});
		return () => unsubscribe();
	}, []);

	const retry = () => {
		NetInfo.fetch().then((state) => setOnline(state.isConnected !== false));
	};

	if (!ready) return null;

	return (
		<SafeAreaProvider>
			<StatusBar style="light" />
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
