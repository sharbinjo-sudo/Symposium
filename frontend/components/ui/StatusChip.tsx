import { cn } from "@/lib/cn";

type StatusChipProps = {
  tone: "pending" | "verified" | "rejected" | "clarify" | "neutral";
  children: string;
};

export function StatusChip({ tone, children }: StatusChipProps) {
  return <span className={cn("status-chip", `status-chip-${tone}`)}>{children}</span>;
}

