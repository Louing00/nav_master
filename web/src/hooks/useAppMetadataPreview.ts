import { useCallback, useEffect, useState } from 'react';
import { previewAppMetadata, type AppMetadataPreview } from '../api/admin';
import { getErrorMessage } from '../api/client';

type PreviewState = {
  data: AppMetadataPreview | null;
  error: string;
  loading: boolean;
};

function isPreviewableUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function useAppMetadataPreview(url: string, enabled: boolean) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<PreviewState>({ data: null, error: '', loading: false });
  const normalizedUrl = url.trim();

  useEffect(() => {
    if (!enabled || !isPreviewableUrl(normalizedUrl)) {
      setState({ data: null, error: '', loading: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, error: '', loading: true });
    const timer = window.setTimeout(async () => {
      try {
        const data = await previewAppMetadata(normalizedUrl, controller.signal);
        setState({ data, error: '', loading: false });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ data: null, error: getErrorMessage(error), loading: false });
        }
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, normalizedUrl, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  return {
    ...state,
    refresh,
    validUrl: isPreviewableUrl(normalizedUrl),
  };
}
