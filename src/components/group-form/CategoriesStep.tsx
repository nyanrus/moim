import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { resolveCategoryLabel } from "~/lib/place";
import { cn } from "~/lib/utils";
import type { EventCategoryOption } from "~/hooks/useEventCategories";

type Props = {
  categories: EventCategoryOption[];
  selectedCategories: string[];
  onToggle: (slug: string) => void;
  onBack: () => void;
  onNext: () => void;
};

export function CategoriesStep(props: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#333]">Categories</h3>
        <p className="text-[13px] text-[#888] mt-1">
          Select categories that best describe your group's focus.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
        {props.categories.map((cat) => (
          <label
            key={cat.slug}
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 border rounded-md cursor-pointer transition-colors",
              props.selectedCategories.includes(cat.slug)
                ? "border-primary bg-primary/5"
                : "border-border",
            )}
          >
            <Checkbox
              checked={props.selectedCategories.includes(cat.slug)}
              onCheckedChange={() => props.onToggle(cat.slug)}
            />
            <span className="text-sm">{resolveCategoryLabel(cat)}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={props.onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 mr-1">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back
        </Button>
        <Button onClick={props.onNext}>
          Next
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 ml-1">
            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
