import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { useEventCategoryMap } from "~/hooks/useEventCategories";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { useAuth } from "~/routes/__root";
import { useGeolocation } from "~/hooks/useGeolocation";
import { HeroCarousel, type CarouselSlide } from "~/components/HeroCarousel";

export const Route = createFileRoute("/")({
  component: HomePage,
});


type EventItem = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  headerImageUrl: string | null;
  groupHandle: string | null;
  groupName: string | null;
  organizerHandle: string | null;
  organizerDisplayName: string | null;
  organizerActorUrl: string | null;
};

type CheckinItem = {
  id: string;
  note: string | null;
  createdAt: string;
  placeName: string;
  placeId: string;
  userDisplayName: string;
  userHandle: string | null;
  userAvatarUrl: string | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n._("just now");
  if (mins < 60) return i18n._("{mins}m ago", { mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return i18n._("{hours}h ago", { hours });
  const days = Math.floor(hours / 24);
  return i18n._("{days}d ago", { days });
}

function HomePage() {
  const { user } = useAuth();
  const { categoryMap } = useEventCategoryMap();
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { location: geoLocation } = useGeolocation();

  // Initial fetch (without geolocation)
  useEffect(() => {
    const fetchSlides = fetch("/api/carousel")
      .then((r) => r.json())
      .then((data) => setSlides(data.slides ?? []))
      .catch(() => {});

    const fetchEvents = fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.events ?? []))
      .catch(() => {});

    const fetchCheckins = fetch("/api/check-ins?limit=10")
      .then((r) => r.json())
      .then((data) => setCheckins(data.checkins ?? []))
      .catch(() => {});

    Promise.all([fetchSlides, fetchEvents, fetchCheckins]).finally(() => setLoading(false));
  }, []);

  // Re-fetch carousel with geolocation when available
  useEffect(() => {
    if (!geoLocation) return;
    const qs = `?lat=${geoLocation.lat}&lng=${geoLocation.lng}`;
    fetch(`/api/carousel${qs}`)
      .then((r) => r.json())
      .then((data) => setSlides(data.slides ?? []))
      .catch(() => {});
  }, [geoLocation]);

  const gridEvents = events.slice(0, 6);

  return (
    <div className="space-y-12">
      {/* Hero */}
      {loading ? (
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-8 w-screen">
          <div className="h-64 bg-muted animate-pulse" />
        </div>
      ) : slides.length > 0 ? (
        <HeroCarousel slides={slides} />
      ) : (
        <FallbackHero user={user} />
      )}

      {/* Upcoming Events */}
      {gridEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight"><Trans id="Upcoming Events" message="Upcoming Events" /></h2>
            <Link to="/events" className="text-sm text-primary hover:underline">
              <Trans id="View all →" message="View all →" />
            </Link>
          </div>
          <div className="flex flex-col">
            {gridEvents.map((event) => (
              <EventListRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Check-ins */}
      {checkins.length > 0 && (
        <section>
          <div className="flex items-center justify-between pb-3 border-b-2 border-foreground mb-4">
            <h2 className="text-xl font-semibold tracking-tight"><Trans id="Recent Check-ins" message="Recent Check-ins" /></h2>
            <div className="flex items-center gap-3">
              {user && (
                <Button size="sm" asChild>
                  <Link to="/places"><Trans id="Check In" message="Check In" /></Link>
                </Button>
              )}
              <Link to="/places" className="text-[12px] text-[#888] hover:text-foreground underline underline-offset-2">
                <Trans id="View all" message="View all" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-[#f0f0f0]">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="flex items-start gap-3 py-3 first:pt-0">
                <Avatar className="size-8 shrink-0">
                  {checkin.userAvatarUrl && <AvatarImage src={checkin.userAvatarUrl} alt={checkin.userDisplayName} />}
                  <AvatarFallback className="text-xs bg-muted">
                    {checkin.userDisplayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold truncate">{checkin.userDisplayName}</span>
                    <span className="text-[11px] text-[#bbb]">&middot;</span>
                    <span className="text-[11px] text-[#999] shrink-0">{timeAgo(checkin.createdAt)}</span>
                  </div>
                  <Link
                    to="/places/$placeId"
                    params={{ placeId: checkin.placeId }}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground hover:underline underline-offset-2 mt-0.5"
                  >
                    <span className="text-[11px] font-normal text-[#999]"><Trans id="at" message="at" /></span>
                    {checkin.placeName}
                  </Link>
                  {checkin.note && (
                    <p className="text-[12px] text-[#666] mt-1 italic">{checkin.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Show fallback feature cards when there's no content at all */}
      {!loading && slides.length === 0 && events.length === 0 && checkins.length === 0 && (
        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base"><Trans id="Events" message="Events" /></CardTitle>
              <CardDescription>
                <Trans id="Create, discover, and RSVP to events hosted by groups across the fediverse." message="Create, discover, and RSVP to events hosted by groups across the fediverse." />
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base"><Trans id="Places" message="Places" /></CardTitle>
              <CardDescription>
                <Trans id="Find and share venues, spaces, and locations where communities gather." message="Find and share venues, spaces, and locations where communities gather." />
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base"><Trans id="Federated" message="Federated" /></CardTitle>
              <CardDescription>
                <Trans id="Sign in with your fediverse account. Follow groups from Mastodon, Misskey, and more." message="Sign in with your fediverse account. Follow groups from Mastodon, Misskey, and more." />
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}
    </div>
  );
}

/* ─── Hero Carousel moved to ~/components/HeroCarousel.tsx ─── */
/* ─── Fallback Hero ─── */

function FallbackHero({ user }: { user: { handle: string } | null }) {
  return (
    <section className="flex flex-col items-center text-center py-12 space-y-4">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        <Trans id="Discover events,<0/>together across the fediverse" components={{ 0: <br /> }} message="Discover events,<0/>together across the fediverse" />
      </h1>
      <p className="max-w-lg text-lg text-muted-foreground">
        <Trans id="Moim is a federated events and places service — like connpass meets foursquare, powered by ActivityPub." message="Moim is a federated events and places service — like connpass meets foursquare, powered by ActivityPub." />
      </p>
      <div className="flex gap-3 pt-2">
        <Button asChild>
          <Link to="/events"><Trans id="Browse Events" message="Browse Events" /></Link>
        </Button>
        {!user && (
          <Button variant="outline" asChild>
            <Link to="/auth/signin"><Trans id="Sign in" message="Sign in" /></Link>
          </Button>
        )}
      </div>
    </section>
  );
}

/* ─── Event List Row (horizontal editorial layout) ─── */

function EventListRow({ event }: { event: EventItem }) {
  const start = new Date(event.startsAt);
  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLabel = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayNum = start.getDate().toString();
  const monthAbbr = start.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const weekdayAbbr = start.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();

  const hostLabel = event.groupHandle
    ? (event.groupName ?? `@${event.groupHandle}`)
    : event.organizerHandle
      ? `@${event.organizerHandle}`
      : null;

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="group flex items-start gap-4 py-4 border-b border-[#e0e0e0] hover:bg-[#fafafa] transition-colors"
    >
      {/* Thumbnail or date fallback */}
      {event.headerImageUrl ? (
        <img
          src={event.headerImageUrl}
          alt=""
          aria-hidden="true"
          className="rounded object-cover shrink-0"
          style={{ width: 140, height: 94, minWidth: 140, maxWidth: 140 }}
        />
      ) : (
        <div className="w-[140px] h-[94px] shrink-0 flex flex-col items-start justify-center pl-4 border-l-[3px] border-foreground">
          <span className="text-4xl font-extrabold leading-none text-foreground">{dayNum}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/60 mt-0.5">{monthAbbr}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/40">{weekdayAbbr}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 py-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#555] mb-1">
          {dateLabel} · {timeLabel}
        </p>
        <h3 className="text-lg font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1">
          {event.title}
        </h3>
        {hostLabel && (
          <p className="text-sm text-[#555] mb-1">
            <Trans id="Hosted by <0>{hostLabel}</0>" values={{ hostLabel }} components={{ 0: <strong className="text-foreground" /> }} message="Hosted by <0>{hostLabel}</0>" />
          </p>
        )}
        {event.location && (
          <p className="text-sm text-[#777] truncate">{event.location}</p>
        )}
      </div>
    </Link>
  );
}
