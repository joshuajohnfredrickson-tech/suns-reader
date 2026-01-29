'use client';

interface SystemToastProps {
  message: string;
  visible: boolean;
}

export function SystemToast({ message, visible }: SystemToastProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none`}
    >
      <div
        className={`px-10 py-5 bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-sm text-white text-lg font-semibold tracking-wide rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 ease-out ${
          visible
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {message}
      </div>
    </div>
  );
}
