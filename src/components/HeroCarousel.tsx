import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trans } from "@lingui/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "~/components/ui/carousel";
import { useEventCategoryMap } from "~/hooks/useEventCategories";
import { useCarouselAutoplay } from "~/hooks/useCarouselAutoplay";

export type BannerSlide = {
  type: "banner";
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  altText: string | null;
};

export type EventSlide = {
  type: "event";
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
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

export type CarouselSlide = BannerSlide | EventSlide;

const SLIDE_DURATION = 5000;

export function HeroCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { progress, pauseAutoplay, resumeAutoplay } = useCarouselAutoplay(
    api,
    slides.length,
    SLIDE_DURATION,
  );

  useEffect(() => {
    if (!api) return;
    const handleSelect = () => setCurrent(api.selectedScrollSnap());
    handleSelect();
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);
    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);

  useEffect(() => {
    setCurrent(0);
  }, [slides]);

  const slide = slides[current] ?? slides[0];
  const lastIndex = slides.length - 1;

  const getSlideState = useCallback((index: number) => {
    if (slides.length <= 1) {
      return { isActive: true, isAdjacent: false, shouldLoadMedia: true };
    }
    const prevIndex = current === 0 ? lastIndex : current - 1;
    const nextIndex = current === lastIndex ? 0 : current + 1;
    const isActive = index === current;
    const isAdjacent = index === prevIndex || index === nextIndex;
    return { isActive, isAdjacent, shouldLoadMedia: isActive || isAdjacent };
  }, [current, lastIndex, slides.length]);

  return (
    <div
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] -mt-8 w-screen"
      onMouseEnter={pauseAutoplay}
      onMouseLeave={resumeAutoplay}
    >
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: slides.length > 1,
        }}
        className="relative"
      >
        <CarouselContent className="ml-0">
          {slides.map((item, index) => {
            const { isActive, shouldLoadMedia } = getSlideState(index);
            return (
              <CarouselItem
                key={`${item.type}-${item.id}`}
                className="pl-0"
                aria-hidden={!isActive || undefined}
                inert={!isActive || undefined}
              >
                <div className="relative h-[200px] overflow-hidden transition-all duration-500 md:h-[340px]">
                  {item.type === "banner" ? (
                    <BannerSlideContent
                      slide={item}
                      isActive={isActive}
                      shouldLoadMedia={shouldLoadMedia}
                    />
                  ) : (
                    <EventSlideContent
                      slide={item}
                      isActive={isActive}
                      shouldLoadMedia={shouldLoadMedia}
                    />
                  )}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {slides.length > 1 && (
          <>
            <CarouselPrevious
              className="left-4 top-1/2 size-10 -translate-y-1/2 rounded-full border-0 bg-black/20 text-white hover:bg-black/40 hover:text-white disabled:pointer-events-none disabled:opacity-40"
            />
            <CarouselNext
              className="right-4 top-1/2 size-10 -translate-y-1/2 rounded-full border-0 bg-black/20 text-white hover:bg-black/40 hover:text-white disabled:pointer-events-none disabled:opacity-40"
            />

            {(() => {
              const isLight = slide.type === "event" && !slide.headerImageUrl;
              const activeColor = isLight ? "#111" : "white";
              const inactiveColor = isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)";
              return (
                <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
                  {slides.map((_, i) => {
                    if (i === current) {
                      return (
                        <div key={i} className="relative h-[3px] w-5 overflow-hidden rounded-full" style={{ background: inactiveColor }}>
                          <div
                            className="absolute inset-y-0 left-0 h-full rounded-full"
                            style={{
                              width: `${progress}%`,
                              background: activeColor,
                            }}
                          />
                        </div>
                      );
                    }
                    return (
                      <div
                        key={i}
                        className="h-[3px] w-5 rounded-full"
                        style={{ background: inactiveColor }}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </Carousel>
    </div>
  );
}

/* ─── Banner Slide Content ─── */

function BannerSlideContent({
  slide,
  isActive,
  shouldLoadMedia,
}: {
  slide: BannerSlide;
  isActive: boolean;
  shouldLoadMedia: boolean;
}) {
  const handleClick = () => {
    fetch("/api/banner-clicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bannerId: slide.id }),
    }).catch(() => {});
  };

  return (
    <a
      href={slide.linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block w-full h-full relative overflow-hidden"
      tabIndex={isActive ? undefined : -1}
    >
      {shouldLoadMedia ? (
        <>
          <img
            src={slide.imageUrl}
            alt=""
            aria-hidden="true"
            loading={isActive ? "eager" : "lazy"}
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl"
          />
          <img
            src={slide.imageUrl}
            alt={slide.altText ?? slide.title}
            loading={isActive ? "eager" : "lazy"}
            className="relative w-full h-full object-contain"
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-muted"
        />
      )}
      <div className="absolute top-3 left-3 md:top-4 md:left-6">
        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-black/50 text-white">
          <Trans id="AD" message="AD" />
        </span>
      </div>
    </a>
  );
}

/* ─── Event Slide Content ─── */

function EventSlideContent({
  slide,
  isActive,
  shouldLoadMedia,
}: {
  slide: EventSlide;
  isActive: boolean;
  shouldLoadMedia: boolean;
}) {
  const { categoryMap } = useEventCategoryMap();
  const start = new Date(slide.startsAt);
  const dateStr = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayNum = start.getDate().toString();

  const hostLabel = slide.groupHandle
    ? (slide.groupName ?? `@${slide.groupHandle}`)
    : slide.organizerHandle
      ? `@${slide.organizerHandle}`
      : null;

  const hasImage = Boolean(slide.headerImageUrl);

  return (
    <div
      className="h-full px-6 py-6 md:py-0 flex items-center overflow-hidden bg-cover bg-center relative"
      style={{
        background: hasImage && shouldLoadMedia
          ? `linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${slide.headerImageUrl}) center/cover no-repeat`
          : "#fafafa",
      }}
    >
      {!hasImage && (
        <span
          className="absolute right-8 top-1/2 -translate-y-1/2 text-8xl font-extrabold select-none pointer-events-none"
          style={{ color: "rgba(0,0,0,0.06)", lineHeight: 1 }}
          aria-hidden="true"
        >
          {dayNum}
        </span>
      )}

      <div className="mx-auto max-w-5xl w-full relative z-10" style={{ color: hasImage ? "white" : "#111" }}>
        <div className="flex items-center gap-3 mb-1 md:mb-2">
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: hasImage ? "rgba(255,255,255,0.6)" : "#555" }}
          >
            {dateStr} · {timeStr}
          </p>
          {slide.categoryId && (
            <Badge
              variant="secondary"
              className={hasImage ? "bg-white/20 border-white/30 hover:bg-white/30" : "bg-black/8 border-black/10 hover:bg-black/12"}
              style={{ color: hasImage ? "white" : "#111" }}
            >
              {categoryMap.get(slide.categoryId) ?? slide.categoryId}
            </Badge>
          )}
        </div>

        <h1
          className="text-2xl font-extrabold tracking-tight md:text-3xl mb-1 md:mb-2 line-clamp-1 md:line-clamp-2"
          style={{ color: hasImage ? "white" : "#111" }}
        >
          {slide.title}
        </h1>

        {slide.location && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm mb-1" style={{ color: hasImage ? "rgba(255,255,255,0.8)" : "#555" }}>
            <span>@ {slide.location}</span>
          </div>
        )}

        {hostLabel && (
          <p className="text-xs md:text-sm mb-3 md:mb-6" style={{ color: hasImage ? "rgba(255,255,255,0.7)" : "#777" }}>
            <Trans id="Hosted by <0>{hostLabel}</0>" values={{ hostLabel }} components={{ 0: <strong style={{ color: hasImage ? "white" : "#333" }} /> }} message="Hosted by <0>{hostLabel}</0>" />
          </p>
        )}

        <div className="flex gap-3">
          <Button
            asChild
            className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
            style={hasImage ? { background: "white", color: "#111827" } : { background: "#111", color: "white" }}
          >
            <Link to="/events/$eventId" params={{ eventId: slide.id }} tabIndex={isActive ? undefined : -1}>
              <Trans id="View Event" message="View Event" />
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-8 md:h-9 text-xs md:text-sm px-3 md:px-4"
            style={
              hasImage
                ? { background: "transparent", color: "white", borderColor: "rgba(255,255,255,0.5)" }
                : { background: "transparent", color: "#333", borderColor: "rgba(0,0,0,0.2)" }
            }
          >
            <Link to="/events" tabIndex={isActive ? undefined : -1}><Trans id="Browse All Events" message="Browse All Events" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
