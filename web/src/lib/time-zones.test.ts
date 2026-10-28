import { zoneChoices, zoneCity, zoneLabel, zoneMatches, zoneSearch } from "./time-zones";

test("a zone is its city and its general name, never its id", () => {
  expect(zoneCity("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
  expect(zoneLabel("America/New_York")).toBe("New York (Eastern time)");
  expect(zoneLabel("America/Chicago")).toBe("Chicago (Central time)");
  expect(zoneLabel("Europe/Paris")).not.toMatch(/\//);
});

test("a zone with no city is shown as it is", () => {
  expect(zoneLabel("UTC")).toBe("UTC");
});

test("the choices are in the order of their labels, each zone once", () => {
  const found = zoneChoices(["Europe/Paris", "America/New_York", "Europe/Paris", "America/Chicago"]);
  expect(found.map((c) => c.id)).toEqual(["America/Chicago", "Europe/Paris", "America/New_York"].sort((a, b) => zoneLabel(a).localeCompare(zoneLabel(b), "en")));
  expect(new Set(found.map((c) => c.id)).size).toBe(found.length);
});

test("typing narrows by city, by the zone's name or by the id's words", () => {
  const ny = { id: "America/New_York", label: zoneLabel("America/New_York") };
  expect(zoneMatches(ny, "new yo")).toBe(true);
  expect(zoneMatches(ny, "new_yo")).toBe(true);
  expect(zoneMatches(ny, "eastern")).toBe(true);
  expect(zoneMatches(ny, "paris")).toBe(false);
  expect(zoneMatches(ny, "  ")).toBe(true);
});

test("typing also matches the region and the offset from UTC", () => {
  const la = { id: "America/Los_Angeles", label: zoneLabel("America/Los_Angeles") };
  expect(zoneMatches(la, "pacific")).toBe(true);
  expect(zoneMatches(la, "america")).toBe(true);
  expect(zoneMatches(la, "utc-")).toBe(true);
  expect(zoneMatches({ id: "Europe/Paris", label: zoneLabel("Europe/Paris") }, "utc-8")).toBe(false);
});

test("searching lists the well-known cities of a zone first, then the other places that match, then the region and offset matches", () => {
  const ids = ["Pacific/Auckland", "America/Tijuana", "America/Vancouver", "America/Los_Angeles", "America/Whitehorse", "Europe/Paris"];
  const found = zoneSearch(zoneChoices(ids), "pacific");
  const order = found.map((c) => c.id);
  // The cities of Pacific time lead, the best known first; the zone only named Pacific by its region comes last.
  expect(order[0]).toBe("America/Los_Angeles");
  expect(order.indexOf("America/Vancouver")).toBeLessThan(order.indexOf("America/Tijuana"));
  expect(order[order.length - 1]).toBe("Pacific/Auckland");
  expect(order).not.toContain("Europe/Paris");
  // With nothing typed it is the whole list by label.
  expect(zoneSearch(zoneChoices(ids), "  ").map((c) => c.id)).toEqual(zoneChoices(ids).map((c) => c.id));
});
