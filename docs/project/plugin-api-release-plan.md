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
5. **Linking files by hand** (F36), only if the check finds `record.edit` of `replaces` can't do it under the core's own
   rules.
6. **The pack builders' batch** (P2, `docs/project/plugin-answers-34-48.md`): items 170, 172, 173, 183 to 189, 191, 193 to
   197, 199 to 201, 203 to 210 and 219, grouped as that file groups them (reviewing and applying; records, references and
   placement; screens; runs, packets and models; install and setup; guide and test kit corrections).

## Release

One version (0.3.90), one `docs/plugin-api-0.x.md` note listing every part, one guide regeneration, one message per pack
builder naming what they asked for and its guide section.
