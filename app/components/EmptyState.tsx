interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, icon = '📰', actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2 text-foreground">
          {title}
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {message}
        </p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-6 py-3 bg-accent text-white rounded-lg hover:opacity-90 active:opacity-80 transition-opacity"
            style={{ touchAction: 'manipulation' }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
