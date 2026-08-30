import { z } from "zod";
import type { EventConfig } from "@/lib/types";

const fullNamePattern = /^(?!.*@)(?!.*\d)[A-Za-z]+(?:[ .'-][A-Za-z]+)*$/;
const indianMobileHint = "Enter a valid Indian mobile number, like +91XXXXXXXXXX.";

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
  })
});

export function createRegistrationSchema() {
  return z.object({
    eventCode: z.string().min(2, "Please choose an event."),
    eventCodes: z
      .array(z.string().min(2))
      .min(1, "Please choose at least one event.")
      .refine((codes) => !(codes.includes("WC") && codes.includes("VS")), {
        message:
          "Choose either Web Craft or Visualytics, not both, due to the event schedule. Check Timeline page for more details."
      }),
    transactionId: z
      .string()
      .trim()
      .min(1, "UPI transaction ID is required.")
      .regex(/^\d{12}$/, "Enter the 12-digit UPI transaction ID."),
    paymentDate: z.string().trim().min(1, "Payment date is required."),
    paymentUploadToken: z.string().trim().min(1, "Payment screenshot is required."),
    consentGiven: z.literal(true, {
      errorMap: () => ({ message: "Please confirm the privacy note to continue." })
    }),
    participants: z
      .array(participantSchema)
      .min(1, "Participant details are required.")
      .max(1, "Only one participant is allowed per registration.")
  });
}
