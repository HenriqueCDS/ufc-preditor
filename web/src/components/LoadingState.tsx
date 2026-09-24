/** Spinner + message, shown by loading.tsx on navigation and while the page fetches from the API. */
export function LoadingState({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-24 text-neutral-400">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-800 border-t-red-600" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
