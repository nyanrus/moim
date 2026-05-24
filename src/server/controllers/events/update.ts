import { eq, and, sql } from "drizzle-orm";
import { db } from "~/server/db/client";
import { actors, events, eventOrganizers, eventQuestions, eventTiers, groupMembers, places, rsvpAnswers, rsvps } from "~/server/db/schema";
import { getSessionUser } from "~/server/auth";
import { getEventCategories } from "~/server/events/categories";
import { getAcceptedCount, autoPromoteWaitlist } from "~/server/events/waitlist";
import { sanitizeContactFields } from "~/server/events/rsvp-helpers";
import { persistRemoteActor } from "~/server/fediverse/resolve";
import { reverseGeocodeCountry } from "~/server/geo/reverse-geocode";
import { optional } from "~/server/controllers/utils";
import { deriveNewEventTicketingSettings } from "~/server/services/ticketing";
import * as EventTicketingSettingsRepo from "~/server/repositories/event-ticketing-settings";

type Body = {
  eventId?: string;
  title?: string;
  description?: string;
  categoryId?: string;
  groupActorId?: string | null;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  location?: string;
  externalUrl?: string;
  placeId?: string | null;
  venueDetail?: string | null;
  eventType?: string;
  meetingUrl?: string | null;
  organizerLat?: number;
  organizerLng?: number;
  headerImageUrl?: string | null;
  allowAnonymousRsvp?: boolean;
  anonymousContactFields?: { email?: string; phone?: string } | null;
  questions?: Array<{
    id?: string;
    question: string;
    sortOrder: number;
    required: boolean;
  }>;
  tiers?: Array<{
    id?: string;
    name: string;
    description?: string | null;
    price?: string | null;
    priceAmount?: number | null;
    sortOrder: number;
    opensAt?: string | null;
    closesAt?: string | null;
    capacity?: number | null;
  }>;
  organizerHandles?: string[];
  externalOrganizers?: Array<{ name: string; homepageUrl?: string }>;
};

type Computed = {
  startsAt: Date;
  endsAt: Date | undefined;
  requestedEventType: "online" | "in_person" | undefined;
  meetingUrlUpdate: string | null | undefined;
  clearPlaceForOnline: boolean;
  countryUpdate: string | null | undefined;
  convertingToGroup: boolean;
};

export const POST = async ({ request }: { request: Request }) => {
  const user = await getSessionUser(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;

  if (!body?.eventId || !body?.title?.trim() || !body?.startsAt) {
    return Response.json(
      { error: "eventId, title, and startsAt are required" },
      { status: 400 },
    );
  }

  const [event] = await db
    .select({
      id: events.id,
      organizerId: events.organizerId,
      groupActorId: events.groupActorId,
    })
    .from(events)
    .where(eq(events.id, body.eventId))
    .limit(1);

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const authzError = await authorize(event, user.id, body);
  if (authzError) return authzError;

  const convertingToGroup = !!(body.groupActorId && !event.groupActorId);

  const validationError = await validateCategory(event, body);
  if (validationError) return validationError;

  const computedOrError = await deriveComputedFields(body, convertingToGroup);
  if (computedOrError instanceof Response) return computedOrError;
  const computed = computedOrError;

  try {
    await updateEventFields(event.id, body, computed);
    if (body.questions !== undefined) {
      await reconcileQuestions(event.id, body.questions);
    }
    if (body.tiers !== undefined) {
      await reconcileTiers(event.id, body.tiers);
    }
    if (body.organizerHandles !== undefined || body.externalOrganizers !== undefined) {
      await reconcileOrganizers(event.id, body.organizerHandles, body.externalOrganizers);
    }
    return Response.json({ event: { id: event.id, title: body.title.trim() } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update event";
    return Response.json({ error: message }, { status: 500 });
  }
};

async function authorize(
  event: { groupActorId: string | null; organizerId: string },
  userId: string,
  body: Body,
): Promise<Response | null> {
  if (event.groupActorId) {
    const [membership] = await db
      .select({ role: groupMembers.role })
      .from(groupMembers)
      .innerJoin(actors, eq(groupMembers.memberActorId, actors.id))
      .where(
        and(
          eq(groupMembers.groupActorId, event.groupActorId),
          eq(actors.userId, userId),
          eq(actors.type, "Person"),
        ),
      )
      .limit(1);
    if (!membership) return Response.json({ error: "Forbidden" }, { status: 403 });
  } else if (event.organizerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Personal → group conversion: verify membership in target group
  if (body.groupActorId && !event.groupActorId) {
    const [targetMembership] = await db
      .select({ role: groupMembers.role })
      .from(groupMembers)
      .innerJoin(actors, eq(groupMembers.memberActorId, actors.id))
      .where(
        and(
          eq(groupMembers.groupActorId, body.groupActorId),
          eq(actors.userId, userId),
          eq(actors.type, "Person"),
        ),
      )
      .limit(1);
    if (!targetMembership) {
      return Response.json({ error: "You are not a member of this group" }, { status: 403 });
    }
  }

  return null;
}

async function validateCategory(
  event: { groupActorId: string | null },
  body: Body,
): Promise<Response | null> {
  const willBeGroupEvent = !!(body.groupActorId ?? event.groupActorId);
  if (willBeGroupEvent && !body.categoryId) {
    return Response.json({ error: "categoryId is required for group events" }, { status: 400 });
  }
  if (body.categoryId) {
    const allCategories = await getEventCategories();
    const validCategoryIds = new Set(allCategories.map((c) => c.slug));
    if (!validCategoryIds.has(body.categoryId)) {
      return Response.json({ error: "Invalid categoryId" }, { status: 400 });
    }
  }
  return null;
}

async function deriveComputedFields(body: Body, convertingToGroup: boolean): Promise<Computed | Response> {
  const startsAt = new Date(body.startsAt!);
  if (Number.isNaN(startsAt.getTime())) {
    return Response.json({ error: "Invalid startsAt date" }, { status: 400 });
  }

  const endsAt = body.endsAt ? new Date(body.endsAt) : undefined;
  if (endsAt && Number.isNaN(endsAt.getTime())) {
    return Response.json({ error: "Invalid endsAt date" }, { status: 400 });
  }

  const requestedEventType =
    body.eventType === "online" || body.eventType === "in_person"
      ? body.eventType
      : undefined;

  let meetingUrlUpdate: string | null | undefined;
  let clearPlaceForOnline = false;
  if (requestedEventType === "online") {
    const raw = body.meetingUrl?.trim();
    if (!raw) {
      return Response.json({ error: "meetingUrl is required for online events" }, { status: 400 });
    }
    try {
      new URL(raw);
    } catch {
      return Response.json({ error: "meetingUrl must be a valid URL" }, { status: 400 });
    }
    meetingUrlUpdate = raw;
    clearPlaceForOnline = true;
  } else if (requestedEventType === "in_person") {
    meetingUrlUpdate = null;
  } else if (body.meetingUrl !== undefined) {
    meetingUrlUpdate = body.meetingUrl?.trim() || null;
  }

  // Country: online → from organizer GPS; in_person place change → re-derive from place coords.
  let countryUpdate: string | null | undefined;
  if (requestedEventType === "online") {
    let c: string | null = null;
    if (
      typeof body.organizerLat === "number"
      && typeof body.organizerLng === "number"
      && Number.isFinite(body.organizerLat)
      && Number.isFinite(body.organizerLng)
    ) {
      const result = await reverseGeocodeCountry(body.organizerLat, body.organizerLng);
      if (result) c = result.code;
    }
    countryUpdate = c;
  } else if (body.placeId !== undefined) {
    let c: string | null = null;
    if (body.placeId) {
      const [place] = await db
        .select({ latitude: places.latitude, longitude: places.longitude })
        .from(places)
        .where(eq(places.id, body.placeId))
        .limit(1);
      if (place?.latitude && place?.longitude) {
        const result = await reverseGeocodeCountry(
          parseFloat(place.latitude),
          parseFloat(place.longitude),
        );
        if (result) c = result.code;
      }
    }
    countryUpdate = c;
  }

  return {
    startsAt,
    endsAt,
    requestedEventType,
    meetingUrlUpdate,
    clearPlaceForOnline,
    countryUpdate,
    convertingToGroup,
  };
}

async function updateEventFields(eventId: string, body: Body, computed: Computed) {
  const { startsAt, endsAt, requestedEventType, meetingUrlUpdate, clearPlaceForOnline, countryUpdate, convertingToGroup } = computed;
  await db
    .update(events)
    .set({
      title: body.title!.trim(),
      description: optional(body.description, (v) => v?.trim() || null),
      categoryId: optional(body.categoryId, (v) => v ?? null),
      startsAt,
      endsAt: optional(body.endsAt, () => endsAt ?? null),
      timezone: optional(body.timezone),
      location: optional(body.location, (v) => v?.trim() || null),
      externalUrl: optional(body.externalUrl, (v) => v?.trim() || ""),
      placeId: clearPlaceForOnline ? null : optional(body.placeId, (v) => v || null),
      venueDetail: clearPlaceForOnline ? null : optional(body.venueDetail, (v) => v?.trim() || null),
      ...(requestedEventType !== undefined ? { eventType: requestedEventType } : {}),
      ...(meetingUrlUpdate !== undefined ? { meetingUrl: meetingUrlUpdate } : {}),
      ...(countryUpdate !== undefined ? { country: countryUpdate } : {}),
      headerImageUrl: optional(body.headerImageUrl, (v) => v || null),
      allowAnonymousRsvp: optional(body.allowAnonymousRsvp, (v) => !!v),
      anonymousContactFields: optional(body.allowAnonymousRsvp, (v) =>
        v ? sanitizeContactFields(body.anonymousContactFields) : null,
      ),
      ...(convertingToGroup ? { groupActorId: body.groupActorId!, published: false } : {}),
    })
    .where(eq(events.id, eventId));
}

async function reconcileQuestions(eventId: string, questions: NonNullable<Body["questions"]>) {
  const submittedIds = questions.filter((q) => q.id).map((q) => q.id as string);

  const existing = await db
    .select({ id: eventQuestions.id })
    .from(eventQuestions)
    .where(eq(eventQuestions.eventId, eventId));

  // Delete questions that were removed and have no answers
  for (const eq_ of existing) {
    if (!submittedIds.includes(eq_.id)) {
      const [answerRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(rsvpAnswers)
        .where(eq(rsvpAnswers.questionId, eq_.id));

      if (answerRow.count === 0) {
        await db.delete(eventQuestions).where(eq(eventQuestions.id, eq_.id));
      }
    }
  }

  for (const q of questions) {
    if (q.id && existing.some((e) => e.id === q.id)) {
      await db
        .update(eventQuestions)
        .set({ question: q.question, sortOrder: q.sortOrder, required: q.required })
        .where(eq(eventQuestions.id, q.id));
    } else {
      await db.insert(eventQuestions).values({
        eventId,
        question: q.question,
        sortOrder: q.sortOrder,
        required: q.required,
      });
    }
  }
}

async function reconcileTiers(eventId: string, tiers: NonNullable<Body["tiers"]>) {
  const submittedTierIds = tiers.filter((t) => t.id).map((t) => t.id as string);

  const existingTiers = await db
    .select({ id: eventTiers.id })
    .from(eventTiers)
    .where(eq(eventTiers.eventId, eventId));

  // Delete tiers that were removed and have no RSVPs
  for (const et of existingTiers) {
    if (!submittedTierIds.includes(et.id)) {
      const [rsvpRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(rsvps)
        .where(eq(rsvps.tierId, et.id));
      if (rsvpRow.count === 0) {
        await db.delete(eventTiers).where(eq(eventTiers.id, et.id));
      }
    }
  }

  for (const t of tiers) {
    const newCapacity = t.capacity === 0 ? null : (t.capacity ?? null);

    if (t.id && existingTiers.some((e) => e.id === t.id)) {
      const [oldTier] = await db
        .select({ capacity: eventTiers.capacity })
        .from(eventTiers)
        .where(eq(eventTiers.id, t.id));
      const oldCapacity = oldTier?.capacity ?? null;

      await db
        .update(eventTiers)
        .set({
          name: t.name,
          description: t.description !== undefined ? (t.description?.trim() || null) : undefined,
          price: t.price !== undefined ? (t.price?.trim() || null) : undefined,
          priceAmount: t.priceAmount !== undefined ? (t.priceAmount ?? null) : undefined,
          sortOrder: t.sortOrder,
          opensAt: t.opensAt ? new Date(t.opensAt) : null,
          closesAt: t.closesAt ? new Date(t.closesAt) : null,
          capacity: newCapacity,
        })
        .where(eq(eventTiers.id, t.id));

      // Auto-promote waitlist when capacity opens up
      if (newCapacity === null && oldCapacity !== null) {
        await autoPromoteWaitlist(db as any, t.id);
      } else if (newCapacity !== null && oldCapacity !== null && newCapacity > oldCapacity) {
        const accepted = await getAcceptedCount(db as any, t.id);
        const spotsToFill = newCapacity - accepted;
        if (spotsToFill > 0) {
          await autoPromoteWaitlist(db as any, t.id, spotsToFill);
        }
      }
    } else {
      await db.insert(eventTiers).values({
        eventId,
        name: t.name,
        description: t.description?.trim() || null,
        price: t.price?.trim() || null,
        priceAmount: t.priceAmount ?? null,
        sortOrder: t.sortOrder,
        opensAt: t.opensAt ? new Date(t.opensAt) : null,
        closesAt: t.closesAt ? new Date(t.closesAt) : null,
        capacity: newCapacity,
      });
    }
  }

  // Always keep at least one tier
  const remainingTiers = await db
    .select({ id: eventTiers.id })
    .from(eventTiers)
    .where(eq(eventTiers.eventId, eventId));
  if (remainingTiers.length === 0) {
    await db.insert(eventTiers).values({
      eventId,
      name: "General",
      sortOrder: 0,
    });
  }

  const currentTiers = await db
    .select({ priceAmount: eventTiers.priceAmount })
    .from(eventTiers)
    .where(eq(eventTiers.eventId, eventId));
  const ticketingSettings = deriveNewEventTicketingSettings(
    currentTiers,
    process.env.DEFAULT_PORTONE_PROVIDER_ACCOUNT_ID,
  );
  await EventTicketingSettingsRepo.upsert({
    eventId,
    mode: ticketingSettings.mode,
    provider: ticketingSettings.provider,
    providerAccountId: ticketingSettings.providerAccountId,
    currency: ticketingSettings.currency,
    enabled: ticketingSettings.enabled,
    legacy: false,
  });
}

async function reconcileOrganizers(
  eventId: string,
  organizerHandles: string[] | undefined,
  externalOrganizers: Array<{ name: string; homepageUrl?: string }> | undefined,
) {
  await db.delete(eventOrganizers).where(eq(eventOrganizers.eventId, eventId));

  for (const orgHandle of organizerHandles ?? []) {
    const handle = orgHandle.startsWith("@") ? orgHandle.slice(1) : orgHandle;
    try {
      const actor = await persistRemoteActor(handle);
      await db.insert(eventOrganizers).values({ eventId, actorId: actor.id });
    } catch (err) {
      console.error(`Failed to resolve organizer ${handle}:`, err);
    }
  }

  for (const ext of externalOrganizers ?? []) {
    if (!ext.name?.trim()) continue;
    await db.insert(eventOrganizers).values({
      eventId,
      name: ext.name.trim(),
      homepageUrl: ext.homepageUrl?.trim() || null,
    });
  }
}
