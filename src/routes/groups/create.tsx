import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { usePostHog } from "~/hooks/posthog";
import { useEventCategories } from "~/hooks/useEventCategories";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { BasicInfoStep } from "~/components/group-form/BasicInfoStep";
import { CategoriesStep } from "~/components/group-form/CategoriesStep";
import { ModeratorsStep, type Moderator } from "~/components/group-form/ModeratorsStep";

export const Route = createFileRoute("/groups/create")({
  component: CreateGroupPage,
});

type Phase = "basic" | "categories" | "moderators" | "submitting" | "success" | "error";

const STEPS = ["Group Info", "Categories", "Moderators"] as const;

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex">
      {STEPS.map((label, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        return (
          <div key={label} className="flex-1 text-center">
            <div className={`text-[11px] font-semibold uppercase tracking-wide pb-2 ${
              isCompleted || isActive ? "font-extrabold text-foreground" : "text-[#bbb]"
            }`}>
              {idx + 1} &middot; {label}
            </div>
            <div className={`h-[3px] ${isCompleted || isActive ? "bg-foreground" : "bg-[#e5e5e5]"}`} />
          </div>
        );
      })}
    </div>
  );
}

function CreateGroupPage() {
  const { categories } = useEventCategories();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [phase, setPhase] = useState<Phase>("basic");
  const [error, setError] = useState("");

  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          navigate({ to: "/auth/signin", search: { returnTo: "/groups/create" } });
        } else {
          setAuthed(true);
        }
      })
      .catch(() => navigate({ to: "/auth/signin", search: { returnTo: "/groups/create" } }));
  }, [navigate]);

  // Form data is lifted to parent so it persists across step navigation.
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [createdHandle, setCreatedHandle] = useState("");

  function toggleCategory(slug: string) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug],
    );
  }

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  function addModerator(mod: Moderator) {
    setModerators((prev) => [...prev, mod]);
  }

  function removeModerator(handle: string) {
    setModerators((prev) => prev.filter((m) => m.handle !== handle));
  }

  async function submitGroup() {
    setPhase("submitting");
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          name,
          summary,
          website: website || undefined,
          categories: selectedCategories,
          moderatorHandles: moderators.map((m) => m.handle),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create group");
        setPhase("error");
        return;
      }
      setCreatedHandle(data.group.handle);

      if (avatarFile) {
        try {
          const formData = new FormData();
          formData.append("handle", data.group.handle);
          formData.append("avatar", avatarFile);
          await fetch(`/api/groups/${data.group.id}/avatar`, { method: "POST", body: formData });
        } catch {
          // Avatar upload failure is non-blocking
        }
      }

      posthog?.capture("group_created", { handle: data.group.handle });
      setPhase("success");
    } catch {
      setError("Network error");
      setPhase("error");
    }
  }

  if (authed === null) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const currentStep =
    phase === "basic" ? 0
    : phase === "categories" ? 1
    : phase === "moderators" ? 2
    : phase === "submitting" ? 2
    : phase === "success" ? 3
    : 2;

  const errorBox = error ? (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div className="pb-4 border-b-2 border-foreground">
        <h2 className="text-2xl font-extrabold tracking-tight">Create Group</h2>
      </div>

      {(phase === "basic" || phase === "categories" || phase === "moderators") && (
        <Stepper currentStep={currentStep} />
      )}

      {phase === "basic" && (
        <BasicInfoStep
          handle={handle} onHandleChange={setHandle}
          name={name} onNameChange={setName}
          summary={summary} onSummaryChange={setSummary}
          website={website} onWebsiteChange={setWebsite}
          avatarPreview={avatarPreview} onAvatarChange={handleAvatarChange}
          errorBox={errorBox}
          onNext={() => setPhase("categories")}
        />
      )}

      {phase === "categories" && (
        <CategoriesStep
          categories={categories}
          selectedCategories={selectedCategories}
          onToggle={toggleCategory}
          onBack={() => setPhase("basic")}
          onNext={() => setPhase("moderators")}
        />
      )}

      {phase === "moderators" && (
        <ModeratorsStep
          moderators={moderators}
          onAddLocal={addModerator}
          onAddFediverse={addModerator}
          onRemove={removeModerator}
          onBack={() => setPhase("categories")}
          onSubmit={submitGroup}
          onError={setError}
          errorBox={errorBox}
        />
      )}

      {phase === "submitting" && (
        <div className="py-16 text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
          <p className="text-muted-foreground">Creating your group...</p>
        </div>
      )}

      {phase === "success" && (
        <div className="space-y-4">
          <Alert className="border-[#e5e5e5] bg-[#fafafa] text-[#333]">
            <AlertDescription>Group created successfully!</AlertDescription>
          </Alert>
          <div className="space-y-2">
            <div className="flex gap-3">
              <Button
                onClick={() => navigate({ to: "/groups/$identifier/dashboard", params: { identifier: `@${createdHandle}` } })}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/groups/$identifier", params: { identifier: `@${createdHandle}` } })}
              >
                View Public Page
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Start creating events from the dashboard.
            </p>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-4">
          {errorBox}
          <div className="flex gap-3">
            <Button onClick={() => setPhase("moderators")}>Retry</Button>
            <Button
              variant="outline"
              onClick={() => {
                setPhase("basic");
                setError("");
              }}
            >
              Start over
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
