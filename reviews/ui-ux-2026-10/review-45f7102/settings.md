# Settings: what stays, what moves, what goes

**Source:**
- `docs/project/settings-sort-2026-10-26.md` at `45f71023`: 32 basic, 156 advanced and 198 files-only fields
- the live pages on a fresh install. Advanced shows **178 controls in 40 groups**, because some fields are a checkbox
  per value.

**The rule for a beginner:** the settings someone actually needs fit on one short page. Everything else is decided by
the app, learned from what the person does, or kept in files for whoever deploys it.

## 1. The result

| | Today | After this list |
|---|---|---|
| Basic, on screen | 32 fields on 7 pages, plus Quality and add-on pages in the same menu | **23 fields** on 5 pages (26 with a business, which adds a "Your business" page) |
| Behind Advanced | 156 fields, 40 groups, 178 controls | **28 fields in 8 topics** |
| Off screen | 198 | **324**: 64 more removed and 62 more automated |

The 11 moved fields go where they're used: the business page, Add-ons' "For developers", Backups, Follow-ups' message
style, and the Knowledge glossary.

### The basic page, as a beginner should see it

| Page | Rows (fields) |
|---|---|
| **You** | Your name · Time zone · English spelling · Assistant's name · This workspace's name |
| **AI and spending** | Your AI account (the account list, with Add) · Ask me before anything over · Most to spend in a day · Most in a month |
| **Notices** | Tell me when something needs me (in this browser) · Working hours (days, start, end) · Hold what arrives outside them · Quiet hours · Open Today with the brief · Where reminders go |
| **Backups** | Back up automatically · Synced folder · Backup key (already there) |
| **Appearance** | Light or dark · Comfortable or compact |
| **Your business** (only with one) | Its name, with Rename and Remove · Words that mean the business · Words that mean personal |

**Out of the Settings menu:**
- **Connections** and **Add-ons** get one home: Settings, *instead of* also being in the main menu (README F16).
- **Quality** isn't a setting. It moves to the user menu as "How Reginald is doing".
- **Lists** (project group, phase, priority, status) moves onto the business page, and is hidden without a business.
- **Each add-on's page** stays under Add-ons.

### Advanced, as 8 plain topics

Each topic has a short label per field, with the explanation as the hint, never the schema's description as the label:

| Topic | Fields |
|---|---|
| AI and spending | per-run limit, ask before unpriced work, follow newer models |
| Backups | backups to keep, others can change the synced folder |
| Appearance | brand colour, logo |
| What the assistant learns | learn from corrections, follow on after a move, check on a new model |
| Follow-ups and reminders | chase after N days (one interval, merged from four), snooze for (one list, merged from two) |
| Notices | when the brief shows, most suggestions a day, what a reminder may say outside the app, send to a chat or phone app |
| Mail | set aside codes and alerts, recognise bills/orders/deliveries, how unsure mail is sorted |
| Meetings | prep N hours before, time kept clear around meetings, travel time between places, unaccepted invitations count as free, bookings to the app's calendar, offer date reminders |

## 2. What should not be there at all

Each line is one reason, grouped by kind.

**Duplicates (one setting, two places):**
- Notification quiet hours (`ui.notifications.quiet_hours.*`) are the same as the reminder quiet hours, on the same
  page. Keep one.
- Two snooze lists (`steward.people.snooze_days`, `steward.patterns.snooze_days`). Keep one.
- Four chase intervals (`ui.followups.action_due_within_days`, `undated_after_days`, `question_after_days`,
  `steward.people.quiet_promise_days`). Keep one: "Chase after N days".
- The export interval and commit (`storage.export.*`) do the backup's job in git words. Files only.
- Backups every N hours. Daily, automatically.
- Hold suggestions in quiet hours (`steward.attention.quiet`). Quiet hours already hold everything.
- Add-on switches and keys in Settings (`workspace.plugins.enabled`, `secrets`). The Add-ons screen does this.
- Backup encryption under Advanced, while the Backups page already has the Backup key.

**Internal ids and machinery** (never on any screen):
- `workspace.project.personal` shows `PRJ-1`, and `workspace.user.person` asks for "e.g. PER-1".
- `ai.roles.*` quotes `tasks.<kind>.tier` and "packet".
- `stages.moves` ("deterministic rules"), `steward.version`, `server.*`, `storage.kept_secrets.*`.
- `steward.tracks` shows "Delivery dates / Decisions / Design quality" to a personal user.
- `ui.feedback_to`, the `ui.series.*` counts, `ui.walkthrough.first_promises`.

**Word lists the program uses** (shipped data, improved by the person's choices, never a form):
- the 10 follow-up message templates (`language.messages.nudge_*`, `quiet_*`, `actions_heading`), the 3 notice texts
  (`ui.notifications.message_*`, `test_message`)
- `language.self_words`, `rejecting_words`, `blocked_phrases`, `known_terms_shipped`, `never_shown`, `limit_markings`
- the automated-mail and mail-kind word lists (`watch.automated_mail.senders`, `words`, the 9 `watch.mail_kinds.*`
  lists), `watch.public_mail_domains_extra`
- `steward.meetings.setup_words`, `steward.people.date_words`
- Together with the 72 `language.*` lists already in files, this is the designer's "about 70 word lists": all of them
  become shipped data.

**Numbers the app should simply get right** (automate):
- Today's windows and counts (`ui.today.*`)
- reminder timings (`steward.reminders.missed`, `later_today_hours`, `evening`, `late_after_minutes`,
  `look_ahead_hours`)
- the brief's sizes (`steward.brief.max_lines`, `goals_*`, `remind_*`)
- meeting thresholds, the five date lead times, pattern thresholds, proposal slots and rounding
- AI warning levels (`ai.budgets.warn_at`, `ai.credential_warn_days`, `ai.borrow_other_tier`)
- dates' formats and the holiday calendar (from language and time zone)
- the 27 accepted file types, the "remove quoted text" switch, the toast seconds

**Questions asked in the wrong place:**
- `steward.default_stance` ("manage / alongside / report_to / watch"). Ask per person, when it matters.
- `watch.default_data_level`. Ask when a source is added.
- `workspace.user.accounts`, `our_accounts`. Learn them from sign-ins.
- `workspace.owner_format`. It's a product rule.

## 3. Rules for every setting that stays

1. **The label is at most 60 characters,** in the second person, about what the person gets ("Ask me before anything
   over"). The explanation goes in the hint.
2. **No key names, ids, formats or code words:**
   - no `PRJ-`, `PER-`, `tasks.`, `json`, `tier`, `{full_name}`
   - no group named after a code prefix ("Ui", "Watch", "Steward", "Storage")
3. **"Default: (empty)" and "Changed · Reset" show only when the person changed it.** Today they show on values the
   app set at setup (`shots/19`).
4. **A setting the app set during setup reads as done, not as changed.**
5. **One setting, one place.** Search finds it, and Today's lines link to it.

## 4. Every field

The full list follows. "Was" is its place after the 2026-10-26 sort. The 198 files-only fields stay where they are.

### **Remove** (64)

| Field | Was | Why |
|---|---|---|
| `workspace.user.person` | advanced | An internal record id ("e.g. PER-1"); set at setup. |
| `workspace.owner_format` | advanced | The owner format is a product rule (Team (Full Name)), not a preference. |
| `workspace.project.completed_status` | advanced | Files only; the word for finished is the app's. |
| `workspace.plugins.enabled` | advanced | The Add-ons screen turns add-ons on and holds their keys; a second switch in Settings disagrees with it. |
| `workspace.plugins.secrets` | advanced | The Add-ons screen turns add-ons on and holds their keys; a second switch in Settings disagrees with it. |
| `server.mode` | advanced | Set by whoever deploys it, in files; a wrong value locks the person out. |
| `server.base_path` | advanced | Set by whoever deploys it, in files; a wrong value locks the person out. |
| `server.open_browser` | advanced | Set by whoever deploys it, in files; a wrong value locks the person out. |
| `storage.export.every_minutes` | advanced | "export in data/" and "git repository": files only; duplicate of the backup schedule from the person's side. |
| `storage.export.commit` | advanced | "export in data/" and "git repository": files only; duplicate of the backup schedule from the person's side. |
| `storage.kept_secrets.keep_days` | advanced | Housekeeping intervals; files only. |
| `storage.kept_secrets.undo_grace_minutes` | advanced | Housekeeping intervals; files only. |
| `ai.roles.write.tier` | advanced | Labels quote tasks.<kind>.tier and "packet"; the AI page's own routing covers this for the few who need it. |
| `ai.roles.write.same_account` | advanced | Labels quote tasks.<kind>.tier and "packet"; the AI page's own routing covers this for the few who need it. |
| `ai.roles.check.tier` | advanced | Labels quote tasks.<kind>.tier and "packet"; the AI page's own routing covers this for the few who need it. |
| `ai.roles.check.same_account` | advanced | Labels quote tasks.<kind>.tier and "packet"; the AI page's own routing covers this for the few who need it. |
| `ai.roles.research.tier` | advanced | Labels quote tasks.<kind>.tier and "packet"; the AI page's own routing covers this for the few who need it. |
| `ai.roles.research.same_account` | advanced | Labels quote tasks.<kind>.tier and "packet"; the AI page's own routing covers this for the few who need it. |
| `language.messages.actions_heading` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.quiet_intro` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.quiet_subject` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.nudge_intro` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.nudge_intro_one` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.nudge_ask` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.nudge_ask_one` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.nudge_overdue` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.nudge_second_intro` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.messages.nudge_second_ask` | advanced | Follow-up wording ships with the app; the person edits a message where it's drafted, not a template in Settings. |
| `language.self_words` | advanced | Word lists the program uses; shipped data, not settings. |
| `language.rejecting_words` | advanced | Word lists the program uses; shipped data, not settings. |
| `language.blocked_phrases` | advanced | Word lists the program uses; shipped data, not settings. |
| `language.known_terms_shipped` | advanced | Word lists the program uses; shipped data, not settings. |
| `language.never_shown` | advanced | Word lists the program uses; shipped data, not settings. |
| `language.limit_markings` | advanced | Word lists the program uses; shipped data, not settings. |
| `ui.toast_seconds` | basic | Messages with an Undo stay until dismissed or replaced (WCAG 2.2.1); no one tunes seconds. |
| `ui.feedback_to` | advanced | Set by whoever packages the app. |
| `ui.walkthrough.first_promises` | advanced | Screen tuning; files only. |
| `ui.series.usually_with_share` | advanced | Screen tuning; files only. |
| `ui.series.usually_with_min_meetings` | advanced | Screen tuning; files only. |
| `ui.series.usually_with_max` | advanced | Screen tuning; files only. |
| `ui.notifications.quiet_hours.start` | basic | Duplicate of the reminders' quiet hours on the same page; one quiet hours for notices, reminders and suggestions. |
| `ui.notifications.quiet_hours.end` | basic | Duplicate of the reminders' quiet hours on the same page; one quiet hours for notices, reminders and suggestions. |
| `ui.notifications.message_one` | advanced | Wording ships with the app. |
| `ui.notifications.message_many` | advanced | Wording ships with the app. |
| `ui.notifications.test_message` | advanced | Wording ships with the app. |
| `stages.moves` | advanced | "the person, or deterministic rules": a template's choice, not a setting. |
| `watch.automated_mail.senders` | advanced | Word lists: shipped data, learned from "Always set aside". |
| `watch.automated_mail.words` | advanced | Word lists: shipped data, learned from "Always set aside". |
| `watch.mail_kinds.bill.senders` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.mail_kinds.bill.subject_words` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.mail_kinds.bill.words` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.mail_kinds.order.senders` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.mail_kinds.order.subject_words` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.mail_kinds.order.words` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.mail_kinds.shipping.senders` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.mail_kinds.shipping.subject_words` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.mail_kinds.shipping.words` | advanced | Nine word lists for bills, orders and shipping: shipped data, improved by the person's "Treat as" choices. |
| `watch.public_mail_domains_extra` | advanced | Shipped data. |
| `steward.version` | advanced | A file version. |
| `steward.default_stance` | basic | "manage / alongside / report_to / watch" is office modelling; asked per person when it matters, never as a global default. |
| `steward.tracks` | advanced | Shows "Delivery dates / Decisions / Design quality" to a personal user; what Today watches is the product's. |
| `steward.meetings.setup_words` | advanced | Word lists: shipped data. |
| `steward.people.date_words` | advanced | Word lists: shipped data. |
| `steward.patterns.snooze_days` | advanced | Duplicate of the snooze list above. |

### **Automate** (62)

| Field | Was | Why |
|---|---|---|
| `workspace.user.accounts` | advanced | Learned from the accounts the person signs in with. |
| `workspace.project.personal` | basic | Made at setup and never changed; the picker shows PRJ-1. |
| `workspace.our_accounts` | advanced | Learned from the accounts the person signs in with. |
| `storage.backups.every_hours` | basic | Daily, plus before risky changes; a duplicate of the export interval's job. |
| `storage.files.accepted_types` | advanced | 27 file-type checkboxes including audio/mp4; accept what the app can read. |
| `storage.sync.watch_outside_edits` | advanced | On; edits made elsewhere come back for review. |
| `ai.budgets.first_go` | basic | Always ask the first time; a setting to turn off the first-time question isn't needed. |
| `ai.budgets.warn_at` | advanced | Warn at 80%; no one tunes it. |
| `ai.borrow_other_tier` | advanced | Ask, on Today, when it happens. |
| `ai.credential_warn_days` | advanced | 14 days before a sign-in ends. |
| `dispatch.cleaning.remove_quoted` | advanced | Always on; there's no reason to send quoted history to the AI. |
| `language.messages.date_format` | advanced | From the language and time zone. |
| `language.messages.date_time_format` | advanced | From the language and time zone. |
| `language.holiday_calendar` | advanced | From the language and time zone. |
| `ui.today.mail_hours` | advanced | Today's windows and counts are design decisions; Top priorities goes (F6). |
| `ui.today.mail_max` | advanced | Today's windows and counts are design decisions; Top priorities goes (F6). |
| `ui.today.agenda_days_ahead` | advanced | Today's windows and counts are design decisions; Top priorities goes (F6). |
| `ui.today.schedule_days` | advanced | Today's windows and counts are design decisions; Top priorities goes (F6). |
| `ui.today.stale_after_days` | advanced | Ask about an old undated to-do after 30 days; not a setting. |
| `ui.today.top_priorities_lines` | advanced | Today's windows and counts are design decisions; Top priorities goes (F6). |
| `ui.today.top_priorities_ahead_days` | advanced | Today's windows and counts are design decisions; Top priorities goes (F6). |
| `ui.followups.action_due_within_days` | advanced | Merged into "Chase after N days" or fixed by the app. |
| `ui.followups.undated_after_days` | advanced | Merged into "Chase after N days" or fixed by the app. |
| `ui.followups.second_nudge_items` | advanced | Merged into "Chase after N days" or fixed by the app. |
| `ui.followups.escalate_after_chases` | advanced | Merged into "Chase after N days" or fixed by the app. |
| `watch.set_aside_defaults` | advanced | Set by "Always set aside mail like this" and by each account's own switch. |
| `watch.acting` | advanced | Set by "Always set aside mail like this" and by each account's own switch. |
| `watch.propose_days` | advanced | Fixed by the app. |
| `watch.propose_slots` | advanced | Fixed by the app. |
| `watch.propose_round_minutes` | advanced | Fixed by the app. |
| `watch.look_back_max_items` | advanced | Fixed by the app. |
| `watch.stale_after_hours` | advanced | Fixed by the app. |
| `watch.default_data_level` | advanced | Asked when a source is added; not a global default. |
| `steward.reminders.missed` | advanced | Fixed by the app. |
| `steward.reminders.later_today_hours` | advanced | Fixed by the app. |
| `steward.reminders.evening` | advanced | Fixed by the app. |
| `steward.reminders.late_after_minutes` | advanced | Fixed by the app. |
| `steward.reminders.look_ahead_hours` | advanced | Fixed by the app. |
| `steward.brief.overnight_from` | advanced | Fixed by the app. |
| `steward.brief.max_lines` | advanced | Fixed by the app. |
| `steward.brief.goals_min` | advanced | Fixed by the app. |
| `steward.brief.goals_max` | advanced | Fixed by the app. |
| `steward.brief.offer_reminders` | advanced | Fixed by the app. |
| `steward.brief.remind_within_days` | advanced | Fixed by the app. |
| `steward.meetings.prep_min_open` | advanced | Fixed by the app. |
| `steward.meetings.capture_hours_after` | advanced | Fixed by the app. |
| `steward.meetings.max_items` | advanced | Fixed by the app. |
| `steward.meetings.setup_lead_working_days` | advanced | Fixed by the app. |
| `steward.meetings.invitation_days_ahead` | advanced | Fixed by the app. |
| `steward.people.quiet_promise_days` | advanced | Merged into "Chase after N days". |
| `steward.people.max_facts` | advanced | Fixed by the app. |
| `steward.clashes.days_ahead` | advanced | The schedule's week. |
| `steward.attention.quiet` | advanced | Quiet hours already hold suggestions. |
| `steward.dates.lead_days.deadline` | advanced | Five lead times: the app picks; the person changes one reminder on the reminder itself. |
| `steward.dates.lead_days.renewal` | advanced | Five lead times: the app picks; the person changes one reminder on the reminder itself. |
| `steward.dates.lead_days.expiry` | advanced | Five lead times: the app picks; the person changes one reminder on the reminder itself. |
| `steward.dates.lead_days.warranty` | advanced | Five lead times: the app picks; the person changes one reminder on the reminder itself. |
| `steward.dates.lead_days.bill` | advanced | Five lead times: the app picks; the person changes one reminder on the reminder itself. |
| `steward.areas.propose_after` | advanced | Thresholds the program tunes. |
| `steward.patterns.moved_times` | advanced | Thresholds the program tunes. |
| `steward.patterns.redated_times` | advanced | Thresholds the program tunes. |
| `steward.patterns.owed_replies` | advanced | Thresholds the program tunes. |

### **Move** (11)

| Field | Was | Goes to | Why |
|---|---|---|---|
| `workspace.project.business` | basic | You › Your business | Set by setup's business answer; on screen as the business's name with Rename and Remove, never a project picker. |
| `workspace.project.side_words.personal` | advanced | You › Your business | Shown on the business page as "Words that mean Hale Upholstery"; only with a business. |
| `workspace.project.side_words.business` | advanced | You › Your business | Shown on the business page as "Words that mean Hale Upholstery"; only with a business. |
| `workspace.plugins.catalog.enabled` | advanced | Add-ons › For developers | Catalog feeds are a developer's or a team's. |
| `workspace.plugins.catalog.shipped_feed` | advanced | Add-ons › For developers | Catalog feeds are a developer's or a team's. |
| `workspace.plugins.catalog.feeds` | advanced | Add-ons › For developers | Catalog feeds are a developer's or a team's. |
| `workspace.plugins.catalog.release_tokens` | advanced | Add-ons › For developers | Catalog feeds are a developer's or a team's. |
| `storage.backups.encrypt` | advanced | Backups | Already on the Backups page as Backup key; not twice. |
| `language.messages.greeting` | advanced | Follow-ups › Message style | "How your messages start and end": the two lines a person does want to choose. |
| `language.messages.closing` | advanced | Follow-ups › Message style | "How your messages start and end": the two lines a person does want to choose. |
| `language.known_terms` | advanced | Knowledge › Glossary | The person's own words already have a home: the glossary. |

### Keep **behind Advanced** (28)

| Field | Was | Goes to | Why |
|---|---|---|---|
| `storage.backups.keep` | basic | Backups | Rarely changed. |
| `storage.sync.shared` | advanced | Backups | "Others can change the synced folder" matters for a shared business folder. |
| `ai.budgets.per_run_usd` | basic | AI and spending | The day and month limits are what people think in. |
| `ai.budgets.confirm_unpriced` | advanced | AI and spending | A real choice for local or unpriced services. |
| `ai.models.follow_newest` | advanced | AI and spending | A real choice. |
| `dispatch.knowledge.learn` | advanced | What the assistant learns | Real switches; shorten the labels to one line. |
| `dispatch.knowledge.follow_on` | advanced | What the assistant learns | Real switches; shorten the labels to one line. |
| `dispatch.knowledge.check_on_switch` | advanced | What the assistant learns | Real switches; shorten the labels to one line. |
| `ui.followups.question_after_days` | advanced | Follow-ups and reminders | Becomes the one "Chase after N days"; the three chase intervals merge into it. |
| `ui.brand.color` | basic | Appearance | Branding is for a business or a shared install, not a first-week setting. |
| `ui.brand.logo` | basic | Appearance | Branding is for a business or a shared install, not a first-week setting. |
| `ui.notifications.webhook` | advanced | Notices | "Send notices to a chat or phone app"; the format becomes a choice of named apps, not "json/plain". |
| `ui.notifications.webhook_format` | advanced | Notices | "Send notices to a chat or phone app"; the format becomes a choice of named apps, not "json/plain". |
| `watch.automated_mail.set_aside` | advanced | Mail | Two plain switches: set aside codes and alerts; recognise bills, orders and deliveries. |
| `watch.mail_kinds.enabled` | advanced | Mail | Two plain switches: set aside codes and alerts; recognise bills, orders and deliveries. |
| `watch.sorting` | advanced | Mail | "How unsure mail is sorted": a real cost and privacy choice. |
| `steward.reminders.allowed_data` | advanced | Notices | A privacy choice: what a reminder may say outside the app. |
| `steward.brief.morning_from` | advanced | Notices | When the brief shows; one row. |
| `steward.brief.evening_from` | advanced | Notices | When the brief shows; one row. |
| `steward.brief.weekly_day` | advanced | Notices | When the brief shows; one row. |
| `steward.meetings.prep_hours_before` | advanced | Meetings | "Show meeting prep N hours before". |
| `steward.people.snooze_days` | advanced | Follow-ups and reminders | Becomes the one "Snooze for" list; steward.patterns.snooze_days merges into it. |
| `steward.capacity.buffer_minutes` | advanced | Meetings | Real preferences about the person's day. |
| `steward.capacity.tentative_is_free` | advanced | Meetings | Real preferences about the person's day. |
| `steward.clashes.travel_minutes` | advanced | Meetings | Real preferences about the person's day. |
| `steward.attention.daily_cap` | advanced | Notices | "Most suggestions a day". |
| `steward.dates.bookings_to_calendar` | advanced | Meetings | Real switches. |
| `steward.dates.suggest_reminders` | advanced | Meetings | Real switches. |

### **Keep** on the basic page (23)

| Field | Was | Goes to | Why |
|---|---|---|---|
| `workspace.name` | basic | You | Asked in setup; shown in the header. |
| `workspace.assistant_name` | basic | You | Introduced and renameable in setup's first step. |
| `workspace.user.timezone` | basic | You | Needed; one searchable list. |
| `workspace.language` | basic | You | Spelling the assistant writes in. |
| `storage.backups.automatic` | basic | Backups | The one switch people expect. |
| `storage.sync.folder` | basic | Backups | Needed for a second computer. |
| `ai.budgets.confirm_above_usd` | basic | AI and spending | "Ask me before anything over". |
| `ai.budgets.per_day_usd` | basic | AI and spending | Needed. |
| `ai.budgets.per_month_usd` | basic | AI and spending | Needed. |
| `ui.notifications.enabled` | basic | Notices | One switch: "Tell me when something needs me". |
| `ui.notifications.browser` | basic | Notices | Merged into the switch above as "in this browser". |
| `ui.theme` | basic | Appearance | Needed. |
| `ui.density` | basic | Appearance | Needed. |
| `steward.reminders.working_start` | basic | Notices | One "Working hours" row: days and times. |
| `steward.reminders.working_end` | basic | Notices | One "Working hours" row: days and times. |
| `steward.reminders.working_first_day` | basic | Notices | One "Working hours" row: days and times. |
| `steward.reminders.working_last_day` | basic | Notices | One "Working hours" row: days and times. |
| `steward.reminders.quiet_start` | basic | Notices | The only quiet hours. |
| `steward.reminders.quiet_end` | basic | Notices | The only quiet hours. |
| `steward.reminders.where` | advanced | Notices | "Where should reminders go?" (already on screen). |
| `steward.reminders.where_account` | advanced | Notices | "Where should reminders go?" (already on screen). |
| `steward.hold_outside_hours` | advanced | Notices | Sits with working hours: "Hold what arrives outside them". |
| `steward.brief.enabled` | basic | Notices | "Open Today with the brief". |
