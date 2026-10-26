# The one batched plugin API release (P64)

The owner lifted the plugin API hold once, for one release planned in full first (decisions, 2026-10-26, "The owner's
answers to the designer's full read"). It is built in parts on one branch batch, regenerates the guide once, and is
announced to the pack builders once. After it the hold applies again.

## Order

1. **The project-ending hook** (designer F35, lesson 2 and 8): `registrar.project_ending(fn)` where
   `fn(project, view) -> list[ops]` returns the pack's own ops (for example dropping its open risks); they join the core's
   wind-down group, so the person gets one Undo, one held change when the ending came from an input, and one keep list.
   The same mechanism on `action.drop` (`registrar.on_drop(kind, fn)`) lets a pack drop the record paired with a dropped
   action. A pack that raises or times out is contained like any handler (failure containment), and its items are listed
   as left open, never resolved.
2. **Helpful / Not helpful** on an answer: two new signal kinds (core records, decisions 2026-10-26 "Who made an item"
   and change log 206 left them waiting).
3. **The sent folder of an add-on's sign-in** (P40 point 13): a sign-in names its sent folder (or the service's sent
   label), so reading a person's sent mail needs no button for add-on accounts either.
4. **Older mail from add-on sources** (P48): a connector may answer a bounded look-back (`since`, `max_items`), offered
   only when the connector declares it, estimated and held like other AI work.
5. **Linking files by hand** (F36): **not needed.** The check found `record.edit` of `replaces` can't do it (a watched file is
   never a `file` record, and the families read the folder's own list of paths), and a field on the snapshot would be a
   plugin-visible core change, so the choices were built as the settings `watch.versions.same_document`, `not_same` and
   `current` (CHANGES 219). Optional at the release: move them onto the snapshot as a field if the owner would rather the
   links lived with the record; nothing waits on it.
6. **The pack builders' batch** (P2, `docs/project/plugin-answers-34-48.md`): items 170, 172, 173, 183 to 189, 191, 193 to
   197, 199 to 201, 203 to 210 and 219, grouped as that file groups them (reviewing and applying; records, references and
   placement; screens; runs, packets and models; install and setup; guide and test kit corrections).
7. **What the designer's lessons need from the core's records** (2026-10-26, not built; each waits for this release):
   - **Lead time on any to-do** (lesson 4): a field on the `action` record saying how many working days before its due the
     work must start (a meeting to set up, a document to prepare, an invitation that needs a room), so Today counts it from
     when the work starts and not by matching "setup words" in a meeting's title (which ties it to one language). Today then
     reads the field, names the day when it is past the week ("Set up 1 meeting by Mon 10/26"), and shows an already-sent
     invitation only on its day.
   - **An action and its paired risk** (lesson 8): a way for a pack's action and risk records to name each other, joined to the
     step-1 hook (`registrar.on_drop`), so dropping or finishing one reaches the other; nothing pairs them today.
   - **Facts on any tracked item** (lesson 5, second half): a place for facts on a bare row with no detail page and on a pack's
     record, which today attach only to a project, an event or a series: a generic `about` on the `fact` record naming any
     record, with the page and the packet reading it.
   - **The guide's containment sentence** (lesson 3): `docs/plugin-guide.md` says a hang counts as a failure after
     `steward.pack_call_limit_seconds` (built, `engine/pack_calls.py`) and what happens to a pack's held changes and queued
     requests when it is turned off (design 6.1); the setting is a core one outside the guide, so the regeneration at the
     release adds the sentences, not a new setting.

## Release

One version (0.3.90), one `docs/plugin-api-0.x.md` note listing every part, one guide regeneration, one message per pack
builder naming what they asked for and its guide section.
