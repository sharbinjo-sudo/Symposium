"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { StatusChip } from "@/components/ui/StatusChip";
import { WaterRippleCard } from "@/components/ui/WaterRippleCard";
import { cn } from "@/lib/cn";
import type { EventConfig } from "@/lib/types";

type EventCardProps = {
  event: EventConfig;
};

function renderGraphic(event: EventConfig) {
  if (event.code === "PP") {
    return (
      <div className="event-graphic event-graphic-paper" aria-hidden="true">
        <span className="paper-sheet paper-sheet-one" />
        <span className="paper-sheet paper-sheet-two" />
        <span className="paper-line paper-line-one" />
        <span className="paper-line paper-line-two" />
        <span className="paper-line paper-line-three" />
      </div>
    );
  }

  if (event.code === "CB") {
    return (
      <div className="event-graphic event-graphic-code" aria-hidden="true">
        <span className="code-node code-node-one" />
        <span className="code-node code-node-two" />
        <span className="code-node code-node-three" />
        <span className="code-path code-path-one" />
        <span className="code-path code-path-two" />
        <span className="code-bracket code-bracket-left">{"{"}</span>
        <span className="code-bracket code-bracket-right">{"}"}</span>
      </div>
    );
  }

  if (event.code === "WC") {
    return (
      <div className="event-graphic event-graphic-web" aria-hidden="true">
        <span className="web-browser web-browser-main" />
        <span className="web-browser web-browser-secondary" />
        <span className="web-frame web-frame-one" />
        <span className="web-frame web-frame-two" />
        <span className="web-frame web-frame-three" />
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

export function EventCard({ event }: EventCardProps) {
  const [open, setOpen] = useState(false);
  const feeLabel = event.feeType === "per_team" ? "Per team" : "Per participant";
  const primaryPrize = event.prizes[0] ?? "Prize details announced soon";
  const leadNote = event.importantNotes[0];

  return (
    <WaterRippleCard className={cn("event-card", `event-card-${event.code.toLowerCase()}`)} accent={event.accent}>
      <div className="event-card-shell">
        <div className="event-card-topline">
          <div className="event-card-labels">
            <span className="event-card-number">0{event.order}</span>
            <span className="event-card-track">Technical Event</span>
          </div>
          <StatusChip tone={event.registrationOpen ? "verified" : "pending"}>
            {event.registrationOpen ? "Registration Open" : "Registration Closed"}
          </StatusChip>
        </div>

        <div className="event-card-main">
          <div className="event-card-copy">
            <h3>{event.name}</h3>
            <p className="card-copy">{event.summary}</p>
            <p className="event-card-description">{event.description}</p>
          </div>
          <div className="event-card-visual">{renderGraphic(event)}</div>
        </div>

        <div className="event-card-meta">
          <div className="event-metric">
            <span>Team size</span>
            <strong>
              {event.minTeamSize}-{event.maxTeamSize}
            </strong>
          </div>
          <div className="event-metric">
            <span>Prize</span>
            <strong>{primaryPrize.replace("First Prize: ", "")}</strong>
          </div>
          <div className="event-metric">
            <span>Fee</span>
            <strong>
              Rs. {event.feeAmount} · {feeLabel}
            </strong>
          </div>
        </div>

        {leadNote ? (
          <div className={cn("event-note", `event-note-${leadNote.tone}`)}>
            <span>Important note</span>
            <strong>{leadNote.title}</strong>
            <p>{leadNote.description}</p>
          </div>
        ) : null}

        <div className="event-taglist">
          {event.visualTags.map((item) => (
            <span key={item} className="event-tag">
              {item}
            </span>
          ))}
        </div>

        <div className="card-actions card-actions-split">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={`rules-${event.code}`}
          >
            {open ? "Hide Rules" : "View Rules"}
          </Button>
          <ButtonLink href="/registration" variant="primary" magnetic>
            Register
          </ButtonLink>
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
              <div className="rules-panel">
                <div className="rules-column">
                  <h4>Rules</h4>
                  <ol className="rule-list numbered">
                    {event.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ol>
                </div>
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
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </WaterRippleCard>
  );
}
