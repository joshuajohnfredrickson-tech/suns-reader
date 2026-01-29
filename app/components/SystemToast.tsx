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
        className={`w-[92vw] max-w-[520px] min-h-[76px] px-10 py-6 flex items-center justify-center bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-sm text-white text-xl font-bold rounded-2xl shadow-2xl transition-all duration-300 ease-out ${
          visible
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-[0.98] pointer-events-none'
        }`}
      >
        {message}
      </div>
    </div>
  );
}
