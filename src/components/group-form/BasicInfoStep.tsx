import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";

type Props = {
  handle: string;
  onHandleChange: (v: string) => void;
  name: string;
  onNameChange: (v: string) => void;
  summary: string;
  onSummaryChange: (v: string) => void;
  website: string;
  onWebsiteChange: (v: string) => void;
  avatarPreview: string | null;
  onAvatarChange: (file: File | null) => void;
  errorBox: ReactNode;
  onNext: () => void;
};

export function BasicInfoStep(props: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!props.handle || !props.name || !props.summary) return;
        props.onNext();
      }}
      className="space-y-5"
    >
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#333]">Group Information</h3>
        <p className="text-[13px] text-[#888] mt-1">
          Set up the basic details for your event group.
        </p>
      </div>

      {props.errorBox}

      <div className="space-y-1.5">
        <Label htmlFor="handle">Handle</Label>
        <Input
          id="handle"
          type="text"
          placeholder="tokyo_meetup"
          value={props.handle}
          onChange={(e) => props.onHandleChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          required
        />
        <p className="text-sm text-muted-foreground">
          Lowercase letters, numbers, and underscores only
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Tokyo Meetup"
          value={props.name}
          onChange={(e) => props.onNameChange(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="summary">Description</Label>
        <Textarea
          id="summary"
          placeholder="What is this group about?"
          value={props.summary}
          onChange={(e) => props.onSummaryChange(e.target.value)}
          required
          rows={4}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="website">Website (optional)</Label>
        <Input
          id="website"
          type="url"
          placeholder="https://example.com"
          value={props.website}
          onChange={(e) => props.onWebsiteChange(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="avatar">Profile Image (optional)</Label>
        <div className="flex items-center gap-4">
          {props.avatarPreview ? (
            <img
              src={props.avatarPreview}
              alt="Avatar preview"
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="size-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl font-semibold">
              {props.name ? props.name.charAt(0).toUpperCase() : "?"}
            </div>
          )}
          <div className="flex-1">
            <Input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={(e) => props.onAvatarChange(e.target.files?.[0] ?? null)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Max 5MB. Will be resized to 256x256.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          Next
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 ml-1">
            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>
    </form>
  );
}
