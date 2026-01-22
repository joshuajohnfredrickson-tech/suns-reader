interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          Failed to load articles
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {message}
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
          style={{ touchAction: 'manipulation' }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
