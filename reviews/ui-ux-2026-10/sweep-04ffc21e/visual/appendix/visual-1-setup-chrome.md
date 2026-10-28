# Visual review 1: setup wizard, and the app's chrome and overlays

**Seen at:** `04ffc21e`.

**Evidence:** the sweep screenshots. Paths are relative to `sweep/`; setup shots are in `setup/out`.

**Scores:** each screen is scored 1–5 on Hierarchy / Layout / Spacing / Type / Components / Colour / Empty / Phone.

## Scorecard

| Screen | States | Scores | Overall | Files |
|---|---|---|---|---|
| Wizard shell (header, step list, side note, footer) | D N P | 3/2/3/3/3/4/–/2 | 2.9 | r1-01-welcome-*, r1-02-you-*, r1-07-ai-* |
| Welcome | D N P | 3/2/3/3/3/4/–/4 | 3.1 | r1-01-welcome-day/night/phone |
| You (incl. Rename) | D N P | 3/3/3/3/3/4/–/2 | 3.0 | r1-02-you-*, r1-02-you-phone-steps-open, r1-03-you-rename-open |
| What it's for (empty, business, groups, saved list) | D P | 3/2/2/3/3/3/3/3 | 2.8 | r1-05-work-day, r1-06-work-both-ticked, r2-01-work-group-open, r2-04-work-saved-view |
| AI: top choices | D N P | 3/3/2/3/3/4/–/3 | 3.0 | r1-07-ai-*, r1-08-ai-anthropic |
| AI: Something else and its sub-lists | D P | 2/2/2/3/2/3/–/2 | 2.3 | r1-10, r1-11-ai-another-google, r1-12-ai-app-claude, r1-13-ai-local-ollama, r3-12-ai-else-phone |
| AI: account form, privacy, Advanced | D P | 2/2/2/3/2/3/–/2 | 2.3 | r1-14-ai-generic-works, r1-17-ai-advanced, r3-13-ai-generic-advanced-phone |
| Mail: first view and app-password steps | D | 3/2/2/3/2/3/3/– | 2.6 | r1-21-mail-access, r1-22-mail-apppw-Gmail |
| Mail: Another mail or calendar forms | D | 2/2/2/3/2/3/–/– | 2.3 | r1-23-mail-another, r1-23-mail-another-mailbox |
| Mail: connected, sides, set aside | D N P | 2/2/2/3/1/3/–/3 | 2.3 | r1-26, r1-28-mail-connected-night, r2-07, r2-09, r2-10-*-phone |
| Your promises: before, running, result | D N P | 2/3/3/2/3/3/3/3 | 2.8 | r1-31…33, r2-11-* |
| Backups and folder chooser | D N P | 3/3/2/3/3/4/3/2 | 2.9 | r1-38-backup-*, r1-39-backup-chooser, r1-41-backup-good |
| People | D N P | 2/2/2/2/2/3/3/3 | 2.4 | r1-42, r1-45, r1-48, r2-13-people-sides-* |
| Done | D N P | 3/3/3/3/3/4/3/3 | 3.1 | r1-50-done-day, r2-15-done-*, r3-02-done-all-skipped-night |
| Header | D N P | 3/3/3/3/3/3/–/3 | 3.0 | daily o-d-status, h-d-reginald-pop, o-d-missed, ph-status; settings hdr-* |
| Left menu and phone bottom bar | D N P | 4/4/4/4/3/4/–/4 | 3.9 | daily o-d-sidebar-collapsed, o-d-nav-hover, ph-Yourday, ph-More |
| Hand something in drawer | D P | 3/2/3/3/3/4/3/4 | 3.1 | daily o-d-hand-in, h-d-handin-filled, ph-handin |
| Ask pane, phone Ask sheet | D P | 2/2/2/3/2/3/3/3 | 2.5 | daily o-d-search-typed, o-d-search-enter, se-ladder, se-priya, ph-Ask |
| Missed something? | D | 4/4/3/3/4/4/4/– | 3.7 | daily o-d-missed |
| Status and Reginald popovers | D N P | 3/3/3/2/3/3/–/4 | 3.0 | daily o-d-status, h-d-reginald-pop, ph-status; settings hdr-* |
| User menu, help menu, phone More | D N P | 3/3/3/3/2/3/–/3 | 2.9 | daily o-d-user-menu, o-d-help-menu, ph-usermenu, ph-More; settings hd-d-usermenu, hd-phone-more |
| Shortcuts help | D N P | 3/2/3/2/3/3/–/3 | 2.7 | daily o-d-shortcuts; settings hd-p-shortcuts |
| Feedback dialog | D N | 2/2/2/2/3/3/–/– | 2.3 | daily o-d-feedback; settings hd-write-feedback |
| Toasts | D | 3/4/3/3/3/4/–/– | 3.3 | daily a-mark-sent-undo, a-remind-me, h-d-after-handin-4 |

## V-P1: looks broken, unfinished or confusing

**V1-1. Browser-default boxes on the mail "sides" step.** *(setup r2-07, r2-09, r2-10-*, r1-28)*
- **What I see:** "Who are they for?" and the per-mailbox groups are square default fieldsets: a dark 1px border with the legend cutting the top edge. Everything else is rounded with a soft border. "Set them separately" triples them, and each repeats a grey help line plus a summary sentence in another size.
- **Fix:** one row per side with chips or checkboxes; Inbox, Calendar and Sent as three rows, or one group with "Apply to all"; drop the sentence under each group.
- **Component:** Fieldset / CheckboxGroup.

**V1-2. No single primary action; the footer is inconsistent.**
- **What I see:**
  - Connected mail: Continue sits in the body at x≈1000 while Back is alone in the footer, and "Connect another" and "Set them separately" are centred ghost text at different x.
  - Promises: two blue buttons ("Start" or "Hand something in…" in the body, plus Continue).
  - The disabled Continue's reason hangs under it, and its baseline isn't aligned with "I'll do this later".
- **Fix:** a fixed footer (Back left, "I'll do this later", one primary); in-body actions secondary; the disabled reason above the footer or as a tooltip; section actions as left-aligned ghost buttons.
- **Component:** StepFooter / Button.

**V1-3. "Something else" nests three levels of bordered boxes.** *(r1-10…13, r3-12, r1-17)*
- **What I see:**
  - A fieldset, then a radio-card row, then accordion cards, then another radio-card grid, all with the same 1px dark border, plus a vertical rule.
  - The selected provider's description floats against the bottom border.
  - Descriptions are cut with "…", card heights are uneven, and night borders are very strong.
- **Fix:** three big cards only at the top level. Sub-choices are one grouped single-select list ("Hosted", "An app you're signed in to", "On this computer") with no nested cards and no truncation; the helper text goes inside the selected row or the form below.
- **Component:** RadioCard, plus a new OptionList.

**V1-4. The AI privacy block collides with the line above.** *(r1-14, r1-17)*
- **What I see:** a two-line bold legend sits on the fieldset edge directly under the green "Works." line; the Allow / Not my private mail radios sit under a 3-line grey block.
- **Fix:** a real heading above a bordered panel, 16px after the success line, with the decision as two full-width choice cards.
- **Component:** Fieldset / RadioCard.

**V1-5. The phone wizard.** *(r1-02-you-phone, r1-38-backup-phone, r1-07-ai-phone, r2-13-people-sides-phone)*
- **What I see:**
  - A ~100px empty band above the card on You and Backups.
  - Footers wrap unpredictably.
  - An embedded "AI accounts" management card (Test, "…", "Measure").
  - A "Recommended" pill cramped inline.
  - An oversized focus ring on the first radio.
- **Fix:** one sticky bottom bar (full-width primary, secondary link above); no empty band; badges on their own line.
- **Component:** wizard shell (StepFooter, StepNav).

**V1-6. The wizard card wastes width.**
- **What I see:** a 1150px card holding a ~750px content column plus a grey side note column behind a hairline. On Welcome, a ~500px text column with a lone note far right. The footer rule spans the whole card, so the buttons sit ~350px from the content.
- **Fix:** a centred 640–720px column with the explanation as a subtitle under the step title (as already on the phone), and no side column.
- **Component:** wizard shell / Panel.

**V1-7. What it's for: the warning banner and the saved list.** *(r1-06, r2-01, r2-04)*
- **What I see:**
  - The amber "Reading work mail may need…" sits between fields and touches the next label, so it reads as belonging to the wrong field.
  - The saved list card has no top inset, and "Added so far" touches it.
  - Long business names make two-line labels.
  - Help text is 11–12px.
- **Fix:** put the banner under "A job"; 16px gaps; section titles carry the business name; list rows with dividers and an equal inset.
- **Components:** Notice, FormField, Row.

**V1-8. The People step list.** *(r1-42, r1-45, r1-48, r2-13)*
- **What I see:**
  - Suggestions are plain lines with a checkbox far right, no rows or dividers, and a floating "Add these".
  - "The people in your life" is a raw bullet list where some entries have a full-width select and others a grey caption, so rows differ in shape.
  - The add form has no separation; "Paste a list" is a bare link; the paste textarea has a long bold label.
- **Fix:** shared Rows (name + email left, role select right); one "Add" per suggestion; one inline add form; a quiet "Paste a list" button.
- **Component:** Row / ListDetail.

**V1-9. The Ask pane pushes the page instead of overlaying it.** *(se-ladder, se-priya, o-d-search-typed)*
- **What I see:**
  - The 420px pane squeezes the page, cutting rows ("Send 2 to-dos to Sa…").
  - The pane has no close X and no header rule.
  - "Keep track of something of your own" floats alone as a bold link.
  - "Based on" repeats the whole answer.
  - "Helpful / Not helpful / Correct it" are bare grey text with no hit area.
  - The Hand-in drawer, by contrast, overlays with a header and X.
- **Fix:** make Ask an overlay drawer like Hand something in, with the answer in a card with real buttons and the sources collapsed.
- **Component:** Drawer.

**V1-10. The header search opens Ask, and its width jumps.**
- **What I see:** typing "Priya" opens an empty "Ask Reginald" pane; the box is ~388px wide with the sidebar open and ~290px without.
- **Fix:** a command-palette dropdown (results first, "Ask Reginald: …" last) at a fixed width.
- **Component:** header search.

**V1-11. The user menu is a grab bag.** *(o-d-user-menu, hd-d-usermenu, ph-usermenu)*
- **What I see:**
  - "How Reginald is doing" has a leading checkmark, so it reads as a selected toggle.
  - Theme rows have icons and a trailing check; Spacing rows don't, so the label columns misalign.
  - The "?" menu's "Setup guide" also uses a check icon.
  - "Write feedback" reuses the "Missed something?" icon.
- **Fix:** a profile heading, then "How Reginald is doing" as a plain link, then appearance as two small segmented controls (as on the phone More sheet), with a distinct icon per action and no check used as an icon.
- **Component:** Menu / MenuItem.

**V1-12. The feedback dialog is dense and too tall.** *(o-d-feedback, hd-write-feedback)*
- **What I see:** textarea; grey help in the same style as the error; 2–3 checkboxes with their own paragraphs; a nested "Message preview" fieldset. At night it fills the whole window with no sticky footer.
- **Fix:** collapse the preview behind a disclosure, add a sticky Close / Copy footer, and keep the help to one line.
- **Component:** Dialog.

## V-P2: dated or polish

**V1-13. Tiny, low-contrast help text.** 11–12px grey, glued to controls. Use one 13px help token, 4px above and 16px below. *(FormField)*

**V1-14. Eyebrow headings** sit 0–4px from what's above them ("Services you can connect", "What was read"). Use one section-heading style with 24px top margin.

**V1-15. The mail first view** mixes a provider card with its own Connect, an expanded bullet list, a select, and a right-aligned ghost button under a disabled Connect with no gap. "Add a connection" is a heading nested in a heading. Use a provider list with one Connect per row and a "Use another mailbox" dialog.

**V1-16. App-password steps:** big circled numbers, the link squeezed under step 5 in 11px type. Make the link a button at step 2, and use one 14px style.

**V1-17. "Another mail or calendar":** about 10 stacked fields, a nested "What to read" legend, and an error row with no padding. Show the 2–3 needed fields; the rest go under Advanced.

**V1-18. The Promises result is a wall of bullets:** repeated "Your mail at … from …" sentences, an 11px caveat, and a right-aligned two-row button stack. Use a source list (icon, name, status chip) and a summary stat strip.

**V1-19. Backups:**
- Check and Choose… are different styles, and the help is 11px.
- The chooser is a 560px box with a lone "Your home folder", a floating "Go up one folder", and "There are no folders here."

**Fix:** a breadcrumb, a bordered folder list with icons, and a designed empty row.

**V1-20. Done:** seven rows all read "Done", so the summary says nothing. Show each actual choice ("Anthropic · $2/day", "Example mail connected", "3 people"), with Set up only on skipped rows. The extras card's title is bigger than its section heading, and labels wrap on the phone.

**V1-21. The step rail** shows the word "Done" plus a tiny check on each row, and "You are here" as a second blue line. Use a filled check circle and a bold current row.

**V1-22. Header pills:** the long variable-width "Connected · Backed up…" pill sits beside a separate "Reginald" pill with a dot, and the amber variant is easily confused with them. Use one status pill with a short label ("All good", "Needs restart"), details in the popover. "Missed something?" is the only text ghost in the header and vanishes when a pane opens.

**V1-23. Popovers:** 11px grey headings over 15px text, with long names wrapping. Use a two-column label/value layout with truncation, a status icon and a footer link.

**V1-24. Shortcuts:** 16 flat rows, 10px faint keycaps, descriptions of up to 80 characters, and a double focus ring on Close. Group the shortcuts into two columns with proper keycaps.

**V1-25. Dark mode is only partly designed:**
- A salmon accent on Close and a brown nav fill.
- Dialogs have almost no elevation against the backdrop.

**Fix:** add a border/shadow token for overlays in dark mode, with the accent only on primary actions and the current item.

**V1-26. The Hand something in drawer:** a dashed textarea that doesn't read as a drop zone; a full-width segmented control with a tiny active segment; ~250px of empty space; the disabled "Hand in" has the same weight as Cancel. Use a drop zone with an icon, a hugging segmented control, and a real primary.

**V1-27. Phone sheets are inconsistent:** a short sheet, a tall sheet, a floating card and a full page, with no drag handles. Use one BottomSheet (handle, 16px gutters, sticky action bar). The "+" competes with in-page primaries.

**V1-28. Toasts:** no icon, stacked, and offset from the sidebar edge (80px against 248px). Add a status icon, and place them bottom-centre or bottom-right regardless of the sidebar.

## Patterns (fix once)

- **One FormGroup** with its heading above, never a legend on the border. Covers V1-1, V1-3, V1-4 and V1-17.
- **Wizard shell + StepFooter:** a centred column, a fixed footer, one primary, the disabled reason never under the button. Covers V1-2, V1-5 and V1-6.
- **FormField help text and section heading tokens:** help 13px, gaps of 4 and 16, headings with 24px top margin. Covers V1-7, V1-13, V1-14 and V1-19.
- **RadioCard selected state:** no heavy unselected borders, no truncation, no nesting. Covers V1-3.
- **The overlay family:** one Drawer, one Dialog with a sticky footer, one BottomSheet. Covers V1-9, V1-12, V1-24, V1-26 and V1-27.
- **Menu items:** consistent icons, no check used as an icon. Covers V1-11 and V1-22.
- **The shared Row** for People, popovers and the Done summary. Covers V1-8, V1-20 and V1-23.
- **Status icons instead of the word "Done".** Covers V1-20 and V1-21.
- **Dark-mode overlay elevation and accent use.** Covers V1-25.

## Three screens that most need a redesign

**1. The AI step.**
- A centred 680px column with three equal cards: Anthropic (recommended), OpenAI and Something else.
- Choosing one reveals a single panel below with a 3-step checklist.
- "Something else" is one grouped list.
- A Connect panel holds the key and a status row.
- Privacy gets its own heading with two choice cards.
- The spend summary is one row with Change.
- Advanced is collapsed.
- A fixed footer, which becomes a sticky bar on the phone.

**2. Mail and calendar.**
- A provider list, one row each (logo, name, line, Connect). "What it can access" expands in the row.
- Once connected: a green "Connected" chip plus a "Who is it for?" chip group on one line, with "Set separately" as a link.
- Newsletters are one switch row.
- "Another mail or calendar" is a modal with a kind select and only that kind's fields.
- A fixed footer.

**3. People.**
- Two sections using the same Row.
- Suggestions: name and email, a count chip, a role select and one Add.
- Added people: name, role, side chips and a "…" menu.
- A one-line add form, plus "Paste a list" opening a dialog with a preview and an error count.
- On the phone, rows stack, with 44px targets.

## Gaps (no screenshot)

- **Phone and night:** the Another mail forms, app-password steps, the folder chooser and the mail first view (r1-19-mail-night and -phone actually show Today).
- **Night only:** the AI sub-lists.
- **Not opened:** the promises "Missed something?" and "Choose the Sent folder" panels.
- **Menus, dialogs and popups:** open row "…" menus, confirm dialogs, and the setup-guide popup.
- **Night:** the Hand-in drawer, the Ask pane, Missed something? and the status popover.
- **Phone:** Missed something?, feedback and the Reginald popover.
- **Toasts:** in night and phone.
- **Not captured:** the sign-in popup, and the Anthropic and OpenAI error states.
