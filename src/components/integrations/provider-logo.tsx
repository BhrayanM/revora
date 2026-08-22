import { RadioTower, Workflow } from "lucide-react";
import Image from "next/image";

import type { IntegrationProviderId } from "@/lib/integrations/types";
import { PROVIDER_VISUALS } from "@/lib/product-ux/provider-visuals";
import { cn } from "@/lib/utils";

export function ProviderLogo({
  providerId,
  className,
}: {
  providerId: IntegrationProviderId;
  className?: string;
}) {
  const visual = PROVIDER_VISUALS[providerId];

  if (visual.kind === "neutral") {
    const Icon = visual.icon === "crm" ? Workflow : RadioTower;
    return (
      <div
        aria-hidden="true"
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-secondary text-muted-foreground",
          className,
        )}
      >
        <Icon className="size-5" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-2",
        className,
      )}
    >
      {visual.renderMode === "mask" ? (
        <span
          className="size-6"
          style={{
            backgroundColor: visual.color,
            mask: `url(${visual.assetPath}) center / contain no-repeat`,
            WebkitMask: `url(${visual.assetPath}) center / contain no-repeat`,
          }}
        />
      ) : (
        <Image
          src={visual.assetPath}
          alt=""
          width={72}
          height={72}
          className={cn(
            "size-full object-contain",
            providerId === "slack" && "scale-[1.7]",
          )}
        />
      )}
    </div>
  );
}
