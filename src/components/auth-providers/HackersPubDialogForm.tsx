import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";

export function HackersPubDialogForm({ onClose: _onClose, returnTo }: { onClose: () => void; returnTo?: string }) {
  const [instance, setInstance] = useState("hackers.pub");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setError("");
    const trimmedInstance = instance.trim();
    const trimmedUsername = username.trim();
    if (!trimmedInstance) {
      setError("Please enter a Hackers' Pub instance");
      return;
    }
    if (!trimmedUsername) {
      setError("Please enter your username");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/hackerspub/graphql-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instance: trimmedInstance, username: trimmedUsername, returnTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Failed to start login");
        setLoading(false);
        return;
      }
      setSent(true);
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col items-center justify-center sm:w-40 sm:shrink-0 sm:border-r sm:pr-6">
          <span className="text-5xl">💻</span>
          <p className="mt-2 text-lg font-semibold">Hackers' Pub</p>
        </div>
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Email sent — check your inbox</p>
            <p className="text-sm text-muted-foreground">
              We sent a verification link to the email on your Hackers' Pub account
              <strong> @{username.trim()}</strong>. Click the link to complete sign-in.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setSent(false); setError(""); }}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="flex flex-col items-center justify-center sm:w-40 sm:shrink-0 sm:border-r sm:pr-6">
        <span className="text-5xl">💻</span>
        <p className="mt-2 text-lg font-semibold">Hackers' Pub</p>
        <p className="text-xs text-muted-foreground text-center mt-1">
          Email verification
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="hp-instance">Instance</Label>
            <Input
              id="hp-instance"
              type="text"
              placeholder="hackerspub.dev"
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hp-username">Username</Label>
            <Input
              id="hp-username"
              type="text"
              placeholder="your_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send verification email"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span>🔒</span> We'll send a verification link to your email
        </p>
      </div>
    </div>
  );
}
