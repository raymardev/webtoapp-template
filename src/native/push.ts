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
 * Requires `eas.projectId` in client.config.js (run `eas init` to get one).
 */
export async function registerForPushNotifications(): Promise<string | null> {
	if (!Device.isDevice) return null;

	// Android 13+ only shows the permission prompt once a channel exists, so the
	// channel MUST be created before requesting permission — not after.
	if (Platform.OS === "android") {
		await Notifications.setNotificationChannelAsync("default", {
			name: "Default",
			importance: Notifications.AndroidImportance.DEFAULT,
		});
	}

	const existing = await Notifications.getPermissionsAsync();
	let status = existing.status;
	if (status !== "granted") {
		const requested = await Notifications.requestPermissionsAsync();
		status = requested.status;
	}
	if (status !== "granted") return null;

	if (!config.projectId) {
		console.warn(
			"[webtoapp] Skipping push token: set eas.projectId in client.config.js (run `eas init`).",
		);
		return null;
	}

	try {
		const token = await Notifications.getExpoPushTokenAsync({ projectId: config.projectId });
		return token.data;
	} catch (error) {
		console.warn("[webtoapp] Failed to get push token:", error);
		return null;
	}
}

/** A URL carried on a notification payload, as `data.url`. */
function urlFromResponse(response: Notifications.NotificationResponse): string | null {
	const data = response.notification.request.content.data as { url?: unknown } | null;
	const url = data?.url;
	return typeof url === "string" && url.length > 0 ? url : null;
}

/**
 * Calls `onUrl` when the user taps a notification carrying a `data.url`, including
 * the tap that cold-started the app. Returns an unsubscribe function.
 *
 * Without this a push can't take the user anywhere — which is both a worse
 * experience and a weaker Guideline 4.2 story.
 */
export function subscribeToNotificationTaps(onUrl: (url: string) => void): () => void {
	let active = true;

	// The tap that launched the app from a cold start isn't delivered to listeners.
	Notifications.getLastNotificationResponseAsync()
		.then((response) => {
			if (!active || !response) return;
			const url = urlFromResponse(response);
			if (url) onUrl(url);
		})
		.catch(() => {});

	const sub = Notifications.addNotificationResponseReceivedListener((response) => {
		const url = urlFromResponse(response);
		if (url) onUrl(url);
	});

	return () => {
		active = false;
		sub.remove();
	};
}
