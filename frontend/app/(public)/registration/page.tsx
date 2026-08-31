import { getEvents } from "@/lib/api";
import { RegistrationWizard } from "@/components/registration/RegistrationWizard";
import { siteConfig } from "@/lib/config/site";

type RegistrationPageProps = {
  searchParams?: Promise<{
    event?: string | string[];
  }>;
};

export default async function RegistrationPage({ searchParams }: RegistrationPageProps) {
  const backendEvents = await getEvents();
  const backendEventsByCode = new Map(backendEvents.map((event) => [event.code, event]));
  const events = [...siteConfig.technicalEvents, ...siteConfig.nonTechnicalEvents].map((event) => {
    const backendEvent = backendEventsByCode.get(event.code);

    return backendEvent
      ? {
          ...event,
          feeAmount: backendEvent.feeAmount,
          registrationOpen: backendEvent.registrationOpen
        }
      : event;
  });
  const params = searchParams ? await searchParams : {};
  const eventCode = Array.isArray(params.event) ? params.event[0] : params.event;

  return <RegistrationWizard key={eventCode ?? "default-event"} events={events} initialEventCode={eventCode} />;
}
