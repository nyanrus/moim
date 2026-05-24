import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";

export type Moderator = {
  handle: string;
  name: string;
  source: "local" | "fediverse";
};

type Props = {
  moderators: Moderator[];
  onAddLocal: (mod: Moderator) => void;
  onAddFediverse: (mod: Moderator) => void;
  onRemove: (handle: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onError: (message: string) => void;
  errorBox: ReactNode;
};

export function ModeratorsStep(props: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ handle: string; displayName: string }[]>([]);
  const [fedHandle, setFedHandle] = useState("");
  const [resolving, setResolving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users?query=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.users ?? []);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  function addLocal(user: { handle: string; displayName: string }) {
    if (props.moderators.some((m) => m.handle === user.handle)) return;
    props.onAddLocal({ handle: user.handle, name: user.displayName, source: "local" });
    setSearchQuery("");
    setSearchResults([]);
  }

  async function resolveFediverse() {
    if (!fedHandle.trim()) return;
    setResolving(true);
    try {
      const res = await fetch("/api/actors/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: fedHandle }),
      });
      const data = await res.json();
      if (!res.ok) {
        props.onError(data.error ?? "Failed to resolve handle");
        setResolving(false);
        return;
      }
      const normalized = fedHandle.startsWith("@") ? fedHandle.slice(1) : fedHandle;
      if (!props.moderators.some((m) => m.handle === normalized)) {
        props.onAddFediverse({ handle: normalized, name: data.actor.name, source: "fediverse" });
      }
      setFedHandle("");
    } catch {
      props.onError("Network error");
    }
    setResolving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#333]">Moderators</h3>
        <p className="text-[13px] text-[#888] mt-1">
          Add moderators who will help manage this group.
        </p>
      </div>

      {props.errorBox}

      <Alert className="border-[#e5e5e5] bg-[#fafafa] text-[#555]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
        </svg>
        <AlertDescription>
          You can add or change moderators later from the group dashboard.
        </AlertDescription>
      </Alert>

      <div className="space-y-1.5">
        <Label>Search registered users</Label>
        <Input
          type="text"
          placeholder="Search by name or handle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchResults.length > 0 && (
          <ul className="mt-1 border rounded-md max-h-[200px] overflow-auto">
            {searchResults.map((u) => (
              <li
                key={u.handle}
                onClick={() => addLocal(u)}
                className="px-3 py-2 cursor-pointer hover:bg-accent border-b border-border last:border-b-0"
              >
                <strong>{u.displayName}</strong>{" "}
                <span className="text-muted-foreground">@{u.handle}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Add by fediverse handle</Label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="@user@mastodon.social"
            value={fedHandle}
            onChange={(e) => setFedHandle(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                resolveFediverse();
              }
            }}
          />
          <Button type="button" onClick={resolveFediverse} disabled={resolving}>
            {resolving ? "Verifying..." : "Verify"}
          </Button>
        </div>
      </div>

      {props.moderators.length > 0 && (
        <div className="space-y-1.5">
          <Label>Selected moderators</Label>
          <ul className="space-y-1">
            {props.moderators.map((m) => (
              <li
                key={m.handle}
                className="flex items-center justify-between px-3 py-2 border rounded-md"
              >
                <span className="flex items-center gap-2">
                  <strong>{m.name}</strong>
                  <span className="text-muted-foreground">@{m.handle}</span>
                  {m.source === "fediverse" && (
                    <Badge variant="secondary">fediverse</Badge>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => props.onRemove(m.handle)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={props.onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 mr-1">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back
        </Button>
        <Button onClick={props.onSubmit}>
          Create Group
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 ml-1">
            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
