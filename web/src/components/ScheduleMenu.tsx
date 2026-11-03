// The Schedule's actions on a phone, where the tab bar's plus hands something in and does not add to the schedule: Add to schedule
// and, where a connected calendar can take one, a new event on it, in the "…" menu at the right of the title's row.
import { useState } from "react";
import { useCalendarOptions } from "../lib/acts";
import { useWords } from "../lib/wording";
import { NewEventDrawer } from "./NewEvent";
import { RowMenu } from "./RowMenu";
import { MeetingDrawer } from "./ScheduleCard";

export function ScheduleMenu(props: { today: string }) {
  const { t } = useWords();
  const options = useCalendarOptions();
  const [open, setOpen] = useState<"meeting" | "event" | null>(null);
  const accounts = options.data?.accounts ?? [];
  const entries = [
    { id: "meeting", label: t("meeting.open"), icon: "plus" as const, run: () => setOpen("meeting") },
    ...(accounts.length > 0 ? [{ id: "event", label: t("calendar.new.open"), icon: "calendar" as const, run: () => setOpen("event") }] : []),
  ];
  return (
    <>
      <RowMenu label={t("schedule.title")} actions={entries} />
      {open === "meeting" && <MeetingDrawer today={props.today} onClose={() => setOpen(null)} />}
      {open === "event" && <NewEventDrawer today={props.today} accounts={accounts} onClose={() => setOpen(null)} />}
    </>
  );
}
