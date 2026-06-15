import { ActivityIndicator, StyleSheet, View } from "react-native";
import { config } from "../theme";

export default function LoadingScreen() {
	return (
		<View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
			<ActivityIndicator size="large" color={config.primaryColor} />
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
	},
});
