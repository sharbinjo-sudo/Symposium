import { z } from "zod";
import type { EventConfig } from "@/lib/types";

const fullNamePattern = /^(?!.*@)(?!.*\d)[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const indianMobileHint = "Enter a valid Indian mobile number, like +91XXXXXXXXXX.";
const razorpayOrderIdPattern = /^order_[A-Za-z0-9]+$/;
const razorpayPaymentIdPattern = /^pay_[A-Za-z0-9]+$/;
const razorpaySignaturePattern = /^[A-Fa-f0-9]{64}$/;

function isValidIndianMobile(value: string) {
  const compactValue = value.replace(/[()\s-]+/g, "");

  if (compactValue.startsWith("+91")) {
    return /^[+]91[6-9]\d{9}$/.test(compactValue);
  }

  if (compactValue.startsWith("91") && compactValue.length === 12) {
    return /^91[6-9]\d{9}$/.test(compactValue);
  }

  if (compactValue.length === 10) {
    return /^[6-9]\d{9}$/.test(compactValue);
  }

  return false;
}

export const participantFullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name is required.")
  .regex(fullNamePattern, "Enter a valid name without numbers, phone numbers, or email addresses.");

const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} is required.`);

export const participantSchema = z.object({
  fullName: participantFullNameSchema,
  collegeName: requiredText("College name"),
  rollNumber: z.string().trim().min(2, "Roll number is required."),
  mobileNumber: z
    .string()
    .trim()
    .min(1, "Mobile number is required.")
    .refine(isValidIndianMobile, indianMobileHint),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address."),
  department: requiredText("Department"),
  yearOfStudy: z.string().min(1, "Year of study is required."),
  foodPreference: z.enum(["veg", "non_veg"], {
    errorMap: () => ({ message: "Choose Veg or Non-Veg food preference." })
  }),
  isTeamLeader: z.boolean()
});

export function createRegistrationSchema(event: EventConfig | undefined) {
  const requiresTeamName = (event?.maxTeamSize ?? 1) > 1;

  return z.object({
    eventCode: z.string().min(2, "Please choose an event."),
    teamName: z
      .string()
      .trim()
      .max(100, "Team name is too long.")
      .refine((value) => !requiresTeamName || value.length >= 2, "Team name is required."),
    teamSize: z
      .number()
      .int()
      .min(event?.minTeamSize ?? 1)
      .max(event?.maxTeamSize ?? 2),
    razorpayOrderId: z
      .string()
      .trim()
      .min(1, "Razorpay order ID is required.")
      .regex(razorpayOrderIdPattern, "Enter a valid Razorpay order ID."),
    razorpayPaymentId: z
      .string()
      .trim()
      .min(1, "Razorpay payment ID is required.")
      .regex(razorpayPaymentIdPattern, "Enter a valid Razorpay payment ID."),
    razorpaySignature: z
      .string()
      .trim()
      .min(1, "Razorpay signature is required.")
      .regex(razorpaySignaturePattern, "Enter a valid Razorpay signature."),
    consentGiven: z.literal(true, {
      errorMap: () => ({ message: "Please confirm the privacy note to continue." })
    }),
    participants: z
      .array(participantSchema)
      .min(event?.minTeamSize ?? 1)
      .max(event?.maxTeamSize ?? 2)
  });
}
