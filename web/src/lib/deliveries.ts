// A parcel or order on the schedule (design 7.7): its date range, who carries it and its tracking number as text, and how
// far it has got in words. Every word comes from the wording sheet; nothing here is told apart by color alone.
import type { S } from "./api";
import { monthDay } from "./dates";
import type { useWords } from "./wording";

type T = ReturnType<typeof useWords>["t"];
type Item = Pick<S["AgendaItemView"], "start" | "end" | "delivery">;
/** A delivery as the server sends it, or as an entry's record holds it. */
export type Delivery = NonNullable<S["AgendaItemView"]["delivery"]>;

/** Whether the item is a delivery with no date yet and not arrived: it is on no day, so it is listed under "On its way". */
export function isOnItsWay(item: Pick<S["AgendaItemView"], "days" | "delivery">): boolean {
  return !!item.delivery && !item.delivery.dated && item.delivery.status !== "arrived" && item.days.length === 0;
}

/** A dated delivery's window as a date range, "Oct 30 – Nov 5"; nothing for one day (its day is its heading) or a time. */
export function deliveryRange(item: Item, t: T): string | null {
  if (!item.delivery?.dated || !item.end) return null;
  const first = item.start.slice(0, 10);
  const last = item.end.slice(0, 10);
  return first === last ? null : t("today.agenda.range", { start: monthDay(first), end: monthDay(last) });
}

/** The carrier and the tracking number, each as it is written, for the line under the title. */
export function deliveryDetails(item: Pick<S["AgendaItemView"], "delivery">, t: T): string[] {
  const { delivery } = item;
  if (!delivery) return [];
  return [delivery.carrier, delivery.tracking ? t("today.agenda.delivery.tracking", { number: delivery.tracking }) : null].filter((x): x is string => !!x);
}

/** "Arrived" or "Out for delivery" in words, for a delivery that has got that far; nothing while it is on its way. */
export function deliveryStatusWord(item: Pick<S["AgendaItemView"], "delivery">, t: T): string | null {
  const status = item.delivery?.status;
  return status === "arrived" ? t("today.agenda.delivery.arrived") : status === "out_for_delivery" ? t("today.agenda.delivery.out") : null;
}

/** A delivery as the lines of a record page's details: its status, carrier, tracking number and order number in plain
 * words, and that its date is not known yet; never the stored object. */
export function deliveryLines(delivery: Delivery | null | undefined, t: T): string[] {
  if (!delivery) return [];
  const status = deliveryStatusWord({ delivery }, t) ?? t("today.agenda.on_its_way");
  return [
    status,
    !delivery.dated && delivery.status !== "arrived" ? t("today.agenda.delivery.no_date") : null,
    delivery.carrier ? t("record.delivery.carrier", { carrier: delivery.carrier }) : null,
    delivery.tracking ? t("today.agenda.delivery.tracking", { number: delivery.tracking }) : null,
    delivery.order ? t("record.delivery.order", { number: delivery.order }) : null,
  ].filter((x): x is string => !!x);
}
