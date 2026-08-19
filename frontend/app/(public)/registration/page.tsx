import { getEvents } from "@/lib/api";
import { RegistrationWizard } from "@/components/registration/RegistrationWizard";

type RegistrationPageProps = {
  searchParams?: Promise<{
    event?: string | string[];
  }>;
};

export default async function RegistrationPage({ searchParams }: RegistrationPageProps) {
  const events = await getEvents();
  const params = searchParams ? await searchParams : {};
  const eventCode = Array.isArray(params.event) ? params.event[0] : params.event;

  return <RegistrationWizard key={eventCode ?? "default-event"} events={events} initialEventCode={eventCode} />;
}
