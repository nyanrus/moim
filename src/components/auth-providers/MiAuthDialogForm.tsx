import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";

export function MiAuthDialogForm({ onClose: _onClose, returnTo }: { onClose: () => void; returnTo?: string }) {
  const [instance, setInstance] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    const trimmed = instance.trim();
    if (!trimmed) {
      setError("Please enter a Misskey instance");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/misskey/miauth-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instance: trimmed, returnTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start Misskey login");
        setLoading(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  const trimmed = instance.trim();

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="flex flex-col items-center justify-center sm:w-40 sm:shrink-0 sm:border-r sm:pr-6">
        <span className="text-5xl">🔑</span>
        <p className="mt-2 text-lg font-semibold">Misskey</p>
        <p className="text-xs text-muted-foreground text-center mt-1">
          MiAuth authorization
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
            <Label htmlFor="miauth-instance">Your instance</Label>
            <Input
              id="miauth-instance"
              type="text"
              placeholder="misskey.io"
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              required
              autoFocus
            />
          </div>

          {trimmed && (
            <p className="text-xs text-muted-foreground">
              → You'll be redirected to <strong>{trimmed}</strong> to authorize
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Redirecting..." : "Continue →"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span>🔒</span> Read-only access — we never post on your behalf
        </p>
      </div>
    </div>
  );
}
