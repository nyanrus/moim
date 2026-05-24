import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type PostHogClient = {
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
};

const PostHogContext = createContext<PostHogClient | null>(null);

export function usePostHog(): PostHogClient | null {
  return useContext(PostHogContext);
}

export function PostHogProvider({
  apiKey,
  apiHost,
  children,
}: {
  apiKey: string;
  apiHost?: string;
  children: ReactNode;
}) {
  const [client, setClient] = useState<PostHogClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("posthog-js").then(({ default: posthog }) => {
      if (cancelled) return;
      posthog.init(apiKey, { api_host: apiHost });
      setClient(posthog as unknown as PostHogClient);
    });
    return () => {
      cancelled = true;
    };
  }, [apiKey, apiHost]);

  return <PostHogContext.Provider value={client}>{children}</PostHogContext.Provider>;
}
