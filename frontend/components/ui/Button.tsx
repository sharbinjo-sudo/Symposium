"use client";

import type { ButtonHTMLAttributes } from "react";
import { WaterDropButton } from "@/components/ui/WaterDropButton";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent";
  magnetic?: boolean;
};

export function Button({ children, ...props }: ButtonProps) {
  return <WaterDropButton {...props}>{children}</WaterDropButton>;
}
