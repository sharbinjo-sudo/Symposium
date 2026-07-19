import { AnimatedHeading } from "@/components/ui/AnimatedHeading";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  copy: string;
};

export function SectionHeading({ eyebrow, title, copy }: SectionHeadingProps) {
  return <AnimatedHeading eyebrow={eyebrow} title={title} copy={copy} />;
}
