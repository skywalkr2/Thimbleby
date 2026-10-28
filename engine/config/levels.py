"""Where each setting is shown (design 7.9, "The Settings cut").

Every setting of the app's own files is one of these:

- basic: on a page of Settings (You, AI and spending, Notices, Backups, Appearance, and Your business when there is
  one), named in `BASIC` with the page it is on;
- advanced: behind Advanced, in one of eight plain topics, named in `ADVANCED` with its topic;
- own part: listed for the screens that edit it in their own way (a key box, a list of records, a home of its own on
  another screen), never a row of its own;
- internal: kept only in files, never listed on a screen: removed, automated, a word list or a number the program
  reads, an address, an id, a limit, a format version. Its key, schema and default stay, and it is settable in files,
  environment variables, flags and profiles.

A field's own marker wins. Otherwise a key named in `BASIC`, `ADVANCED` or `OWN_PART` is that kind, and the longest
matching front of `INTERNAL` or `GROUPS_IN_FILES` decides for the rest, so a new field in a group is kept only in
files until someone places it; a field matching nothing here is none of these, and the schema test fails until it is
placed.
"""

from __future__ import annotations

import types
import typing
from typing import Any

from pydantic import BaseModel

#: The page of each basic setting, in the order the page lists them.
BASIC: dict[str, str] = {
    "workspace.user.timezone": "you",
    "workspace.language": "you",
    "workspace.assistant_name": "you",
    "workspace.name": "you",
    "ai.budgets.confirm_above_usd": "ai",
    "ai.budgets.per_day_usd": "ai",
    "ai.budgets.per_month_usd": "ai",
    "ui.notifications.enabled": "today",
    "steward.reminders.working_first_day": "today",
    "steward.reminders.working_last_day": "today",
    "steward.reminders.working_start": "today",
    "steward.reminders.working_end": "today",
    "steward.hold_outside_hours": "today",
    "steward.reminders.quiet_start": "today",
    "steward.reminders.quiet_end": "today",
    "steward.brief.enabled": "today",
    "steward.reminders.where": "today",
    "steward.reminders.where_account": "today",
    "storage.backups.automatic": "backups",
    "storage.sync.folder": "backups",
    "ui.theme": "appearance",
    "ui.density": "appearance",
    "workspace.project.business": "business",
}

#: The topic of each advanced setting, in the order its topic lists them. The topics themselves are in `TOPICS`.
ADVANCED: dict[str, str] = {
    "ai.budgets.per_run_usd": "ai",
    "ai.budgets.confirm_unpriced": "ai",
    "ai.models.follow_newest": "ai",
    "storage.backups.keep": "backups",
    "storage.sync.shared": "backups",
    "ui.brand.color": "appearance",
    "ui.brand.logo": "appearance",
    "dispatch.knowledge.learn": "learns",
    "dispatch.knowledge.follow_on": "learns",
    "dispatch.knowledge.check_on_switch": "learns",
    "ui.followups.question_after_days": "followups",
    "steward.people.snooze_days": "followups",
    "steward.brief.morning_from": "notices",
    "steward.brief.evening_from": "notices",
    "steward.brief.weekly_day": "notices",
    "steward.attention.daily_cap": "notices",
    "steward.reminders.allowed_data": "notices",
    "ui.notifications.webhook": "notices",
    "ui.notifications.webhook_app": "notices",
    # The words that mean each side are learned from where the person files things; they are read here when the
    # assistant needs a nudge, so they sit with filing, not on the business page.
    "workspace.project.side_words.personal": "filing",
    "workspace.project.side_words.business": "filing",
    "watch.automated_mail.set_aside": "mail",
    "watch.mail_kinds.enabled": "mail",
    "watch.sorting": "mail",
    "steward.meetings.prep_hours_before": "meetings",
    "steward.capacity.buffer_minutes": "meetings",
    "steward.clashes.travel_minutes": "meetings",
    "steward.capacity.tentative_is_free": "meetings",
    "steward.dates.bookings_to_calendar": "meetings",
    "steward.dates.suggest_reminders": "meetings",
}

#: The topics an advanced setting can sit under, in the order they are listed.
TOPICS = ("ai", "backups", "appearance", "learns", "followups", "notices", "filing", "mail", "meetings")

#: A topic that has a page of its own: its settings sit on that page, in a closed "More settings" fold at the bottom,
#: and are not listed again under Advanced. Advanced keeps only the topics that are not here.
TOPIC_PAGES: dict[str, str] = {
    "ai": "ai",
    "backups": "backups",
    "appearance": "appearance",
    "notices": "today",
}

#: Listed for the part of a screen that edits them in its own way (a key box, a list of records, a switch on each
#: account), never as a row of their own.
OWN_PART = (
    "workspace.plugins.secrets",
    "storage.backups.encrypt",
    "watch.acting",
    "workspace.project.sides",
    "steward.default_stance",
    # Each has a home of its own: Add-ons, For developers (the catalog fields), Follow-ups, Message style (the greeting
    # and the closing) and Knowledge, Glossary (the person's own words).
    "workspace.plugins.catalog.enabled",
    "workspace.plugins.catalog.shipped_feed",
    "workspace.plugins.catalog.feeds",
    "workspace.plugins.catalog.release_tokens",
    "language.messages.greeting",
    "language.messages.closing",
    "language.known_terms",
)

#: Rows that edit several settings at once. Each is named by its first setting and lists all of them in the order the
#: page or topic lists them; every one is still a setting with its own key, and each is counted once. A screen that
#: has fewer than all of them on the page shows them as rows of their own. Where reminders go is one row too, edited by
#: a part of its own (it is in the screen's list of own parts, so it is not drawn as a merged row).
MERGED_ROWS: dict[str, tuple[str, ...]] = {
    "steward.reminders.working_first_day": (
        "steward.reminders.working_first_day",
        "steward.reminders.working_last_day",
        "steward.reminders.working_start",
        "steward.reminders.working_end",
    ),
    "steward.brief.morning_from": (
        "steward.brief.morning_from",
        "steward.brief.evening_from",
        "steward.brief.weekly_day",
    ),
    "steward.reminders.where": (
        "steward.reminders.where",
        "steward.reminders.where_account",
    ),
    "steward.reminders.quiet_start": (
        "steward.reminders.quiet_start",
        "steward.reminders.quiet_end",
    ),
}

#: Rows of a page that edit a record, not a setting (the person's own name, on their record), by page.
RECORD_ROWS: dict[str, tuple[str, ...]] = {"you": ("person.full_name",)}

#: Removed, automated and moved-without-a-home fields: kept only in files, with their key, schema and default.
FILES_ONLY = (
    # Removed from the screen.
    "workspace.user.person",
    "workspace.owner_format",
    "workspace.project.completed_status",
    "workspace.plugins.enabled",
    "server.mode",
    "server.base_path",
    "server.open_browser",
    "server.addons_dir",
    "storage.export.every_minutes",
    "storage.export.commit",
    "storage.kept_secrets.keep_days",
    "storage.kept_secrets.undo_grace_minutes",
    "ai.roles.write.tier",
    "ai.roles.write.same_account",
    "ai.roles.check.tier",
    "ai.roles.check.same_account",
    "ai.roles.research.tier",
    "ai.roles.research.same_account",
    "language.messages.actions_heading",
    "language.messages.quiet_intro",
    "language.messages.quiet_subject",
    "language.messages.nudge_intro",
    "language.messages.nudge_intro_one",
    "language.messages.nudge_ask",
    "language.messages.nudge_ask_one",
    "language.messages.nudge_overdue",
    "language.messages.nudge_second_intro",
    "language.messages.nudge_second_ask",
    "language.self_words",
    "language.rejecting_words",
    "language.blocked_phrases",
    "language.known_terms_shipped",
    "language.never_shown",
    "language.limit_markings",
    "ui.toast_seconds",
    "ui.feedback_to",
    "ui.walkthrough.first_promises",
    "ui.series.usually_with_share",
    "ui.series.usually_with_min_meetings",
    "ui.series.usually_with_max",
    "ui.notifications.quiet_hours.start",
    "ui.notifications.quiet_hours.end",
    "ui.notifications.message_one",
    "ui.notifications.message_many",
    "ui.notifications.test_message",
    "stages.moves",
    "watch.automated_mail.senders",
    "watch.automated_mail.words",
    "watch.mail_kinds.bill.senders",
    "watch.mail_kinds.bill.subject_words",
    "watch.mail_kinds.bill.words",
    "watch.mail_kinds.order.senders",
    "watch.mail_kinds.order.subject_words",
    "watch.mail_kinds.order.words",
    "watch.mail_kinds.shipping.senders",
    "watch.mail_kinds.shipping.subject_words",
    "watch.mail_kinds.shipping.words",
    "watch.public_mail_domains_extra",
    "steward.version",
    "steward.tracks",
    "steward.meetings.setup_words",
    "steward.people.date_words",
    "steward.patterns.snooze_days",
    # Automated: the app works the value out or fixes it.
    "workspace.user.accounts",
    "workspace.project.personal",
    "workspace.our_accounts",
    "storage.backups.every_hours",
    "storage.files.accepted_types",
    "storage.sync.watch_outside_edits",
    "ai.budgets.first_go",
    "ai.budgets.warn_at",
    "ai.borrow_other_tier",
    "ai.credential_warn_days",
    "dispatch.cleaning.remove_quoted",
    "language.messages.date_format",
    "language.messages.date_time_format",
    "language.holiday_calendar",
    "ui.today.mail_hours",
    "ui.today.mail_max",
    "ui.today.agenda_days_ahead",
    "ui.today.schedule_days",
    "ui.today.stale_after_days",
    "ui.today.fold_batches_after_days",
    "ui.today.top_priorities_lines",
    "ui.today.top_priorities_ahead_days",
    "ui.followups.action_due_within_days",
    "ui.followups.undated_after_days",
    "ui.followups.second_nudge_items",
    "ui.followups.escalate_after_chases",
    "watch.set_aside_defaults",
    "watch.propose_days",
    "watch.propose_slots",
    "watch.propose_round_minutes",
    "watch.look_back_max_items",
    "watch.stale_after_hours",
    "watch.default_data_level",
    "steward.reminders.missed",
    "steward.reminders.later_today_hours",
    "steward.reminders.evening",
    "steward.reminders.late_after_minutes",
    "steward.reminders.look_ahead_hours",
    "steward.brief.overnight_from",
    "steward.brief.max_lines",
    "steward.brief.goals_min",
    "steward.brief.goals_max",
    "steward.brief.offer_reminders",
    "steward.brief.remind_within_days",
    "steward.brief.dated_risk_days",
    "steward.meetings.prep_min_open",
    "steward.meetings.capture_hours_after",
    "steward.meetings.max_items",
    "steward.meetings.setup_lead_working_days",
    "steward.meetings.invitation_days_ahead",
    "steward.meetings.changes_days",
    "steward.meetings.capture_alone",
    "steward.people.quiet_promise_days",
    "steward.people.max_facts",
    "steward.clashes.days_ahead",
    "steward.attention.quiet",
    "steward.attention.quiet_after_dismissals",
    "steward.attention.stop_after_dismissals",
    "steward.attention.learn_days",
    "steward.dates.find_by_rules",
    "steward.dates.find_most",
    "steward.dates.lead_days.deadline",
    "steward.dates.lead_days.renewal",
    "steward.dates.lead_days.expiry",
    "steward.dates.lead_days.warranty",
    "steward.dates.lead_days.bill",
    "steward.areas.propose_after",
    "steward.patterns.moved_times",
    "steward.patterns.redated_times",
    "steward.patterns.owed_replies",
    # Fields no cut named: screen tuning, and word lists and thresholds the program reads.
    "workspace.plugins.preview_seconds",
    "ai.estimates.context_margin",
    "dispatch.knowledge.pack_searches",
    "ui.handled_group",
    "ui.handled_rows_shown",
    "watch.versions.enabled",
    "watch.versions.ignore_words",
    "watch.versions.archive_folders",
    "watch.handled_rule_section",
    "watch.handled_keep_days",
    # Merged into the one notices switch, which stands for showing a notice in this browser too.
    "ui.notifications.browser",
    # The older choice between a chat app's message and plain text, read when no app is picked by name; the person's own
    # apps are entries of a file.
    "ui.notifications.webhook_format",
    "ui.notifications.apps_extra",
    # Mail services of the person's own for the guided mailbox step; the shipped ones are a file.
    "watch.mail_services_extra",
)

#: Fronts of dotted keys (a front matches a key equal to it or starting with it plus a dot) kept only in files.
INTERNAL = (
    "workspace.project",
    "workspace.plugins",
    "workspace.contact_kinds",
    "workspace.phone_min_digits",
    "workspace.demo",
    "storage.backend",
    "storage.export.remote",
    "storage.backups.cloud_path",
    "storage.backups.retry_minutes",
    "storage.backups.before_changes",
    "storage.backups.bulk_change_records",
    "storage.files",
    "storage.sync.lease_stale_after_minutes",
    "ai.evaluation",
    "ai.skills",
    "ai.estimates",
    "ai.models",
    "ai.catalog_refresh_hours",
    "ai.rate_limits",
    "dispatch",
    "checks",
    "language",
    "ui.narrow_below_px",
    "ui.feedback_problem_days",
    "ui.feedback_problem_max",
    "ui.notifications.retry_minutes",
    "watch.versions.version",
    "watch.automated_mail.version",
    "watch.mail_kinds.version",
    "watch.mail_kinds.bill.version",
    "watch.mail_kinds.order.version",
    "watch.mail_kinds.shipping.version",
    "watch.sorting_batch",
    "watch.set_aside_keep_seconds",
    "watch.failures_before_asking",
    "watch.unread_gap_factor",
    "steward.background_stuck_after_minutes",
    "steward.second_move_days",
    "steward.sent_match",
    "steward.capture",
    "steward.conversation",
    "steward.attention.importance",
    "steward.attention.threshold",
    "steward.reply_thread_days",
)

#: Groups whose plain values used to show by default: only what `BASIC` and `ADVANCED` name is shown now, and the
#: rest of the group is kept in files. A list of records in these groups keeps being edited by its own screen.
GROUPS_IN_FILES = (
    "ui.today",
    "ui.followups",
    "ui.walkthrough",
    "ui.series",
    "ui.feedback_to",
    "ui.notifications",
    "ui.toast_seconds",
    "ui.handled_group",
    "ui.handled_rows_shown",
    "steward",
    "watch",
    "workspace.user",
    "workspace.owner_format",
    "workspace.our_accounts",
    "server",
    "storage.export",
    "storage.kept_secrets",
    "storage.backups",
    "storage.sync",
    "storage.files",
    "ai.roles",
    "ai.budgets",
    "stages",
)


def _front(key: str, fronts: tuple[str, ...]) -> int:
    """The length of the longest front of `fronts` that `key` is or sits under, or -1."""
    best = -1
    for front in fronts:
        if key == front or key.startswith(front + "."):
            best = max(best, len(front))
    return best


def level_of(key: str) -> str | None:
    """ "basic", "advanced", "internal", or None for a key no front places. An own part is advanced: listed, flagged so
    no page counts it, and never a row of its own."""
    if key in BASIC:
        return "basic"
    if key in ADVANCED or key in OWN_PART:
        return "advanced"
    if _front(key, FILES_ONLY + INTERNAL + GROUPS_IN_FILES) >= 0:
        return "internal"
    return None


def place_of(key: str) -> tuple[str | None, str | None]:
    """The page and the topic a setting is shown under: a basic setting's page; for an advanced one the page its topic
    has (where it sits in the page's "More settings" fold) or "advanced" for a topic with no page, with the topic; and
    (None, None) for one that is no row."""
    if key in BASIC:
        return BASIC[key], None
    if key in ADVANCED:
        topic = ADVANCED[key]
        return TOPIC_PAGES.get(topic, "advanced"), topic
    return None, None


_ORDER = {key: n for n, key in enumerate([*BASIC, *ADVANCED])}


def order_of(key: str) -> int:
    """Where a setting sits among the shown ones: its page's order, then its topic's."""
    return _ORDER.get(key, len(_ORDER))


def apply(files: dict[str, type[BaseModel]]) -> None:
    """Put the marker on every field of the files' models from the lists above. A field that is shown (basic, advanced
    or an own part) loses any marker it carried, so the lists alone decide; a field kept only in files takes
    `internal`."""
    seen: dict[tuple[type, str], str] = {}

    def walk(model: type[BaseModel], path: list[str]) -> None:
        for name, info in model.model_fields.items():
            here = [*path, name]
            inner = _model_of(info.annotation)
            if inner is not None:
                walk(inner, here)
                continue
            extra: dict[str, Any] = info.json_schema_extra if isinstance(info.json_schema_extra, dict) else {}
            key = ".".join(here)
            level = level_of(key)
            # A group front keeps only the plain values of its group in files: a list of records is edited by its own
            # screen, so a front never changes it.
            if level is None or (level == "internal" and not _plain(info.annotation) and not _named(key)):
                continue
            if seen.get((model, name), level) != level:
                raise RuntimeError(f"{'.'.join(here)} is shared by models that place it differently")
            seen[(model, name)] = level
            kept = {k: v for k, v in extra.items() if k not in ("advanced", "internal")}
            info.json_schema_extra = {**kept, level: True} if level in ("advanced", "internal") else kept or None

    for file, model in files.items():
        walk(model, [file])


def _named(key: str) -> bool:
    """Whether the key is kept in files by name or by a front that holds any field, not only by a group's front."""
    return _front(key, FILES_ONLY + INTERNAL) >= 0


def _plain(annotation: Any) -> bool:
    """Whether a field holds a plain value (text, a number, a choice, a switch, a list of words) a form can show."""
    args = [a for a in typing.get_args(annotation) if a is not type(None)]
    origin = typing.get_origin(annotation)
    if origin is typing.Literal or annotation in (bool, int, float, str):
        return True
    if origin in (typing.Union, getattr(types, "UnionType", None)) and len(args) == 1:
        return _plain(args[0])
    return origin is list and len(args) == 1 and (args[0] is str or typing.get_origin(args[0]) is typing.Literal)


def _model_of(annotation: Any) -> type[BaseModel] | None:
    return annotation if isinstance(annotation, type) and issubclass(annotation, BaseModel) else None
