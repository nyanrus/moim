import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "~/components/ui/collapsible";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "~/lib/utils";

export type Organizer = {
  handle: string;
  name: string;
  source: "local" | "fediverse" | "external";
  homepageUrl?: string;
  imageUrl?: string;
};

type Props = {
  organizers: Organizer[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRemove: (handle: string) => void;
  fedHandle: string;
  onFedHandleChange: (v: string) => void;
  resolving: boolean;
  onResolveFediverse: () => void;
  extName: string;
  onExtNameChange: (v: string) => void;
  extUrl: string;
  onExtUrlChange: (v: string) => void;
  onAddExternal: () => void;
};

export function OrganizersSection(props: Props) {
  return (
    <Collapsible open={props.open} onOpenChange={props.onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between py-2 text-sm font-medium cursor-pointer select-none"
        >
          <span>
            Co-Organizers
            {props.organizers.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                ({props.organizers.length})
              </span>
            )}
          </span>
          <ChevronRightIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              props.open && "rotate-90",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <p className="text-xs text-muted-foreground -mt-1 mb-2">
        Add organizers or external partners. Organizers are Moim or fediverse users. External organizers are companies, communities, or anyone outside the fediverse.
      </p>
      <CollapsibleContent className="space-y-6">
        {props.organizers.length > 0 && (
          <ul className="space-y-1">
            {props.organizers.map((o) => (
              <li
                key={o.handle}
                className="flex items-center justify-between px-3 py-2 border rounded-md"
              >
                <span className="flex items-center gap-2">
                  {o.imageUrl ? (
                    <img src={o.imageUrl} alt="" className="size-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="size-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                      {o.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <strong>{o.name}</strong>
                  {o.source === "external" ? (
                    <>
                      {o.homepageUrl && (
                        <span className="text-muted-foreground text-xs truncate max-w-[200px]">{o.homepageUrl}</span>
                      )}
                      <Badge variant="outline">external</Badge>
                    </>
                  ) : (
                    <>
                      <span className="text-muted-foreground">@{o.handle}</span>
                      {o.source === "fediverse" && (
                        <Badge variant="secondary">fediverse</Badge>
                      )}
                    </>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => props.onRemove(o.handle)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Label>External organizer</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            For companies, communities, or anyone without a Moim or fediverse account.
          </p>
          <div className="flex gap-2 mt-3">
            <Input
              type="text"
              placeholder="Name (e.g. Ubuntu Korea Community)"
              value={props.extName}
              onChange={(e) => props.onExtNameChange(e.target.value)}
              className="flex-1"
            />
            <Input
              type="url"
              placeholder="Homepage URL (optional)"
              value={props.extUrl}
              onChange={(e) => props.onExtUrlChange(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={props.onAddExternal}
              disabled={!props.extName.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        <div>
          <Label>Fediverse user</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add someone from Mastodon, Misskey, or other fediverse platforms.
          </p>
          <div className="flex gap-2 mt-3">
            <Input
              type="text"
              placeholder="@user@mastodon.social"
              value={props.fedHandle}
              onChange={(e) => props.onFedHandleChange(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  props.onResolveFediverse();
                }
              }}
            />
            <Button
              type="button"
              onClick={props.onResolveFediverse}
              disabled={props.resolving}
            >
              {props.resolving ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
