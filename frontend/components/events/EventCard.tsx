"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { WaterRippleCard } from "@/components/ui/WaterRippleCard";
import { cn } from "@/lib/cn";
import type { EventConfig } from "@/lib/types";
import { ButtonLink } from "@/components/ui/ButtonLink";

type EventCardProps = {
  event: EventConfig;
  showRegister?: boolean;
  showRegisterButton?: boolean;
  showImportantNotes?: boolean;
  showTags?: boolean;
};

function renderGraphic(event: EventConfig) {
  if (event.image) {
    return (
      <div className="event-graphic event-graphic-image" aria-hidden="true">
        <img src={event.image} alt={`${event.name} graphic`} className="event-image" loading="lazy" />
      </div>
    );
  }

  return (
    <div className="event-graphic event-graphic-data" aria-hidden="true">
      <span className="data-bar data-bar-one" />
      <span className="data-bar data-bar-two" />
      <span className="data-bar data-bar-three" />
      <span className="data-line" />
      <span className="data-point data-point-one" />
      <span className="data-point data-point-two" />
      <span className="data-point data-point-three" />
    </div>
  );
}

export function EventCard({
  event,
  showRegister = true,
  showRegisterButton = showRegister,
  showImportantNotes = true,
  showTags = true
}: EventCardProps) {
  const [open, setOpen] = useState(false);
  const leadNote = showImportantNotes ? event.importantNotes[0] : undefined;
  const statusLabel = showRegister
    ? event.registrationOpen
      ? "Registration Open"
      : "Registration Closed"
    : "Offline Entry";

  return (
    <WaterRippleCard className={cn("event-card", `event-card-${event.code.toLowerCase()}`)} accent={event.accent}>
      <div className="event-card-shell">
        <div className="event-card-topline">
          <div className="event-card-labels">
            <span className="event-card-number">0{event.order}</span>
            <span className="event-card-track">{event.track} Event</span>
          </div>
          <StatusChip tone={event.registrationOpen ? "verified" : "pending"}>{statusLabel}</StatusChip>
        </div>

        <div className="event-card-main">
          <div className="event-card-copy">
            <h3>{event.name}</h3>
            <p className="card-copy">{event.summary}</p>
            <p className="event-card-description">{event.description}</p>
          </div>
          <div className="event-card-visual">{renderGraphic(event)}</div>
        </div>

        {leadNote ? (
          <div className={cn("event-note", `event-note-${leadNote.tone}`)}>
            <span>Important note</span>
            <strong>{leadNote.title}</strong>
            <p>{leadNote.description}</p>
          </div>
        ) : null}

        {showTags ? (
          <div className="event-taglist">
            {event.visualTags.map((item) => (
              <span key={item} className="event-tag">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className={cn("card-actions", showRegisterButton ? "card-actions-split" : "card-actions-single")}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={`rules-${event.code}`}
          >
            {open ? "Hide Rules" : "View Rules"}
          </Button>
          {showRegisterButton ? (
            <ButtonLink href={`/registration?event=${encodeURIComponent(event.code)}`} variant="primary" magnetic>
              Register
            </ButtonLink>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              id={`rules-${event.code}`}
              className="event-card-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={cn("rules-panel", !showImportantNotes && "rules-panel-single")}>
                <div className="rules-column">
                  <h4>Rules</h4>
                  <ol className="rule-list numbered">
                    {event.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ol>
                </div>
                {showImportantNotes ? (
                  <div className="rules-column">
                    <h4>Important notes</h4>
                    <div className="note-stack">
                      {event.importantNotes.map((note) => (
                        <div key={note.title} className={cn("note-card", `note-card-${note.tone}`)}>
                          <strong>{note.title}</strong>
                          <p>{note.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </WaterRippleCard>
  );
}
