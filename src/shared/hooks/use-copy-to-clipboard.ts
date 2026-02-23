import * as React from 'react';

export interface UseCopyToClipboardReturn {
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
  error: Error | null;
}

export function useCopyToClipboard(): UseCopyToClipboardReturn {
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const copy = React.useCallback(async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) {
      setError(new Error('Clipboard API not available'));
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(null);

      setTimeout(() => {
        setCopied(false);
      }, 2000);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to copy'));
      setCopied(false);
      return false;
    }
  }, []);

  return { copy, copied, error };
}
