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
   label), so reading a person's sent mail needs no button for add-on accounts either. **Built (part A2, CHANGES 221):**
   a declared source marked `sent` (`tests/test_sign_in_sources.py::test_a_sign_in_that_names_its_sent_mail_reads_it_as_the_persons_own_with_no_button`,
   `::test_the_sent_mail_waits_until_the_person_is_known_and_starts_when_they_are_named`).
4. **Older mail from add-on sources** (P48): a connector may answer a bounded look-back (`since`, `max_items`), offered
   only when the connector declares it, estimated and held like other AI work. **Built (part A2, CHANGES 221):**
   `registrar.connector(older=, older_count=)` (`tests/test_look_back_addons.py::test_the_preview_asks_only_for_a_count_within_the_limit_and_writes_nothing`,
   `::test_looking_further_back_reads_the_older_items_within_the_limit_and_holds_them_for_the_go`).
5. **Linking files by hand** (F36): **not needed.** The check found `record.edit` of `replaces` can't do it (a watched file is
   never a `file` record, and the families read the folder's own list of paths), and a field on the snapshot would be a
   plugin-visible core change, so the choices were built as the settings `watch.versions.same_document`, `not_same` and
   `current` (CHANGES 219). Optional at the release: move them onto the snapshot as a field if the owner would rather the
   links lived with the record; nothing waits on it.
6. **The pack builders' batch** (P2, `docs/project/plugin-answers-34-48.md`): items 170, 172, 173, 183 to 189, 191, 193 to
   197, 199 to 201, 203 to 210 and 219, grouped as that file groups them (reviewing and applying; records, references and
   placement; screens; runs, packets and models; install and setup; guide and test kit corrections).
7. **What the designer's lessons need from the core's records** (2026-10-26; lead time and facts built in part A2, CHANGES 221):
   - **Lead time on any to-do** (lesson 4): a field on the `action` record saying how many working days before its due the
     work must start (a meeting to set up, a document to prepare, an invitation that needs a room), so Today counts it from
     when the work starts and not by matching "setup words" in a meeting's title (which ties it to one language). Today then
     reads the field, names the day when it is past the week ("Set up 1 meeting by Mon 10/26"), and shows an already-sent
     invitation only on its day. **Built:** `Action.lead_days`, a list of days on the to-do's page, the setup words only the
     default when it is empty (`tests/test_this_week.py::test_on_a_friday_a_to_do_with_two_days_of_lead_time_due_monday_is_counted_and_without_it_is_not`,
     `::test_a_to_dos_own_lead_time_replaces_the_default_a_meeting_gets_from_its_setup_words`,
     `::test_the_lead_time_is_a_pick_list_of_days_on_the_to_dos_page_and_a_save_keeps_it`).
   - **An action and its paired risk** (lesson 8): a way for a pack's action and risk records to name each other, joined to the
     step-1 hook (`registrar.on_drop`), so dropping or finishing one reaches the other; nothing pairs them today.
   - **Facts on any tracked item** (lesson 5, second half): a place for facts on a bare row with no detail page and on a pack's
     record, which today attach only to a project, an event or a series: a generic `about` on the `fact` record naming any
     record, with the page and the packet reading it. **Built:** `Fact.about` and the op's `about`
     (`tests/test_facts_about.py::test_a_fact_about_a_to_do_is_kept_with_it_and_shown_on_its_page`,
     `::test_a_fact_about_a_packs_own_record_shows_on_its_page`,
     `::test_a_run_working_on_a_record_has_the_facts_about_it_in_its_knowledge`,
     `::test_the_fields_the_person_and_the_fact_added_survive_the_export_round_trip`).
   - **The guide's containment sentence** (lesson 3): `docs/plugin-guide.md` says a hang counts as a failure after
     `steward.pack_call_limit_seconds` (built, `engine/pack_calls.py`) and what happens to a pack's held changes and queued
     requests when it is turned off (design 6.1); the setting is a core one outside the guide, so the regeneration at the
     release adds the sentences, not a new setting.

## Release

One version (0.3.90), one `docs/plugin-api-0.x.md` note listing every part, one guide regeneration, one message per pack
builder naming what they asked for and its guide section.

## Parts (owner, 2026-10-26: "go ahead and run the plugin updates + any that might have been waiting from the writers plugin")

Built one part per builder, at most two at a time, merged and checked part by part; the version (0.3.90), the
`docs/plugin-api-0.x.md` note and the guide are finished once at the end, then one full run, one push and one message per
pack builder.

- **A1, endings and pairs:** `registrar.project_ending` and the drop hook (step 1, lesson 8: an action and its paired
  record), Helpful / Not helpful signal kinds (step 2).
- **A2, sources and records:** the sent folder of an add-on's sign-in (step 3), a connector's bounded look-back (step 4),
  lead time on any to-do and facts on any tracked item (step 7).
- **B1, reviewing, applying and records:** 170, 194, 201, 205, 197, 200, 204, 193, 199, 188.
- **B2, screens, runs and packets:** 195, 187, 189, 207, 210, 209, 191, 196, 203.
- **B3, install, setup, tiers and guide fixes:** 173, 183, 185, 219, 172, 184, 186, 206.

190 (a conversation on a record) is already built (phase S5).
