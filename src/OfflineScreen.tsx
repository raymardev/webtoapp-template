import ErrorScreen from "./components/ErrorScreen";

export default function OfflineScreen({ onRetry }: { onRetry: () => void }) {
	return (
		<ErrorScreen
			emoji="📡"
			title="You're offline"
			subtitle="Check your connection and we'll pick up right where you left off."
			onRetry={onRetry}
		/>
	);
}
