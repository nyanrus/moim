import { useState, useEffect, useRef, createContext, useContext, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { i18n } from "@lingui/core";

// Ensure i18n has an active locale before any component renders (SSR safety)
if (!i18n.locale) {
  i18n.load("en", {});
  i18n.activate("en");
}

const SUPPORTED_LOCALES = ["en", "ko", "ja"];

function resolveLocaleFromHeader(acceptLanguage: string | null): string | null {
  if (!acceptLanguage) return null;
  const parts = acceptLanguage.split(",").map((part) => {
    const [lang, q] = part.trim().split(";q=");
    return { lang: lang.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
  });
  parts.sort((a, b) => b.q - a.q);
  for (const { lang } of parts) {
    const exact = SUPPORTED_LOCALES.find((l) => l === lang);
    if (exact) return exact;
    const prefix = SUPPORTED_LOCALES.find((l) => lang.startsWith(l + "-"));
    if (prefix) return prefix;
  }
  return null;
}
import { env } from "~/server/env";
import { PostHogProvider, usePostHog } from "~/hooks/posthog";
import { I18nProvider } from "~/i18n/provider";
import { Header } from "~/components/layout/Header";
import { Footer } from "~/components/layout/Footer";
import appCss from "~/styles/globals.css?url";

type SessionUser = { handle: string; displayName: string; avatarUrl?: string | null; isAdmin?: boolean; posthogId?: string } | null;

const AuthContext = createContext<{
  user: SessionUser;
  setUser: (u: SessionUser) => void;
  loaded: boolean;
}>({ user: null, setUser: () => {}, loaded: false });

export function useAuth() {
  return useContext(AuthContext);
}

const BottomBarSlotContext = createContext<{
  setBottomBar: (node: ReactNode) => void;
}>({ setBottomBar: () => {} });

export function useBottomBarSlot(node: ReactNode) {
  const { setBottomBar } = useContext(BottomBarSlotContext);
  useEffect(() => {
    setBottomBar(node);
    return () => setBottomBar(null);
  }, [node, setBottomBar]);
}

const getPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const acceptLang = request.headers.get("accept-language");
  const locale = resolveLocaleFromHeader(acceptLang) ?? env.defaultLocale;
  return {
    posthogKey: env.posthogKey ?? null,
    posthogHost: env.posthogHost ?? null,
    locale,
  };
});

export type PublicConfig = Awaited<ReturnType<typeof getPublicConfig>>;

export const Route = createRootRoute({
  loader: () => getPublicConfig(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Moim" },
      { property: "og:title", content: "Moim" },
      { property: "og:description", content: "Federated events & check-ins" },
      { property: "og:image", content: "/logo.png" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootLayout,
});

function PostHogWrapper({ config, children }: { config: PublicConfig; children: React.ReactNode }) {
  if (config.posthogKey) {
    return (
      <PostHogProvider apiKey={config.posthogKey} apiHost={config.posthogHost ?? undefined}>
        {children}
      </PostHogProvider>
    );
  }
  return <>{children}</>;
}

function PostHogIdentify({ user }: { user: SessionUser }) {
  const posthog = usePostHog();
  useEffect(() => {
    if (!posthog) return;
    if (user?.posthogId) {
      posthog.identify(user.posthogId);
    } else {
      posthog.reset();
    }
  }, [posthog, user?.posthogId]);
  return null;
}

function RootLayout() {
  const config = Route.useLoaderData();
  const [user, setUser] = useState<SessionUser>(null);
  const [loaded, setLoaded] = useState(false);
  const [bottomBar, setBottomBar] = useState<ReactNode>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const queryClientRef = useRef<QueryClient>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
    });
  }

  return (
    <html lang={config.locale}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryClientProvider client={queryClientRef.current}>
          <I18nProvider locale={config.locale}>
            <PostHogWrapper config={config}>
              {config.posthogKey && <PostHogIdentify user={user} />}
              <AuthContext.Provider value={{ user, setUser, loaded }}>
                <BottomBarSlotContext.Provider value={{ setBottomBar }}>
                  <div className="relative flex min-h-screen flex-col">
                    <Header />

                    <main className="flex-1">
                      <div className="mx-auto w-full max-w-5xl px-6 py-8 pb-24 md:pb-8">
                        <Outlet />
                      </div>
                    </main>

                    <Footer />

                    {/* Bottom bar slot (mobile only, for page-specific CTAs) */}
                    {bottomBar && (
                      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
                        <div className="border-t bg-background">
                          {bottomBar}
                        </div>
                      </div>
                    )}
                  </div>
                  <Scripts />
                </BottomBarSlotContext.Provider>
              </AuthContext.Provider>
            </PostHogWrapper>
          </I18nProvider>
        </QueryClientProvider>

      </body>
    </html>
  );
}
