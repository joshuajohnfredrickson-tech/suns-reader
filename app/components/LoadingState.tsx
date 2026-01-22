export function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
        <p className="text-zinc-600 dark:text-zinc-400">Loading articles...</p>
      </div>
    </div>
  );
}
