export function formatFoodPreference(value: string) {
  if (value === "non_veg") {
    return "Non-Veg";
  }

  if (value === "veg") {
    return "Veg";
  }

  return value || "Not selected";
}
