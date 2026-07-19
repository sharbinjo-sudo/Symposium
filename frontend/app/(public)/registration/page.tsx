import { getEvents } from "@/lib/api";
import { RegistrationWizard } from "@/components/registration/RegistrationWizard";

export default async function RegistrationPage() {
  const events = await getEvents();

  return <RegistrationWizard events={events} />;
}
