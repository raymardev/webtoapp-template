import { Pressable, StyleSheet, Text, View } from "react-native";
import { config } from "../theme";

type Props = {
	emoji: string;
	title: string;
	subtitle: string;
	onRetry: () => void;
};

/** Generic full-screen state used for both offline and load-error screens. */
export default function ErrorScreen({ emoji, title, subtitle, onRetry }: Props) {
	return (
		<View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
			<Text style={styles.emoji}>{emoji}</Text>
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.subtitle}>{subtitle}</Text>
			<Pressable
				onPress={onRetry}
				style={({ pressed }) => [
					styles.button,
					{ backgroundColor: config.primaryColor, opacity: pressed ? 0.85 : 1 },
				]}
				accessibilityRole="button"
			>
				<Text style={styles.buttonText}>Try again</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 32,
	},
	emoji: { fontSize: 48, marginBottom: 16 },
	title: { color: "#fff", fontSize: 22, fontWeight: "600", marginBottom: 8 },
	subtitle: { color: "#9ca3af", fontSize: 15, textAlign: "center", marginBottom: 24 },
	button: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
