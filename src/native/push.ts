import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { config } from "../theme";

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: false,
	}),
});

/**
 * Requests permission and returns the Expo push token, or null if unavailable.
 * Requires `eas.projectId` in client.config.ts (run `eas init` to get one).
 */
export async function registerForPushNotifications(): Promise<string | null> {
	if (!Device.isDevice) return null;

	const existing = await Notifications.getPermissionsAsync();
	let status = existing.status;
	if (status !== "granted") {
		const requested = await Notifications.requestPermissionsAsync();
		status = requested.status;
	}
	if (status !== "granted") return null;

	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "Default",
			importance: Notifications.AndroidImportance.DEFAULT,
		});
	}

	if (!config.projectId) {
		console.warn(
			"[ship] Skipping push token: set eas.projectId in client.config.ts (run `eas init`).",
		);
		return null;
	}

	try {
		const token = await Notifications.getExpoPushTokenAsync({ projectId: config.projectId });
		return token.data;
	} catch (error) {
		console.warn("[ship] Failed to get push token:", error);
		return null;
	}
}
