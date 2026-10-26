"""Where each setting is shown (design 7.9, "What a setting is shown as").

Every setting of the app's own files is one of three kinds:

- basic: on screen, the first thing a section shows (`engine.settings.BASIC`);
- advanced: behind Advanced, in the words the person who set it up uses (`advanced` marker on the field);
- internal: kept only in files, never listed on a screen (`internal` marker on the field): addresses, ids, callback
  addresses, limits, timeouts, retry counts, ports, cache sizes, similarity cut-offs, word and pattern lists the
  program reads, and format versions.

A field's own marker wins. Otherwise the longest matching front below decides, so a new field in a group takes the
group's kind; a field matching nothing here is neither, and the schema test fails until it is placed.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

#: Fronts of dotted keys (a front matches a key equal to it or starting with it plus a dot) that are advanced.
ADVANCED = (
    "ui.today",
    "ui.followups",
    "ui.walkthrough",
    "ui.series",
    "steward",
    "watch.automated_mail",
    "watch.mail_kinds",
    "watch.propose_days",
    "watch.propose_slots",
    "watch.propose_round_minutes",
    "watch.look_back_max_items",
    "workspace.user.person",
    "workspace.user.accounts",
    "workspace.owner_format",
    "workspace.project.completed_status",
    "workspace.project.side_words",
    "workspace.plugins.enabled",
    "workspace.plugins.catalog.enabled",
    "workspace.plugins.catalog.feeds",
    "workspace.our_accounts",
    "storage.files.accepted_types",
    "storage.kept_secrets",
    "storage.export.every_minutes",
    "storage.export.commit",
    "storage.sync.watch_outside_edits",
    "storage.sync.shared",
    "ai.roles",
    "ai.budgets.warn_at",
    "ai.models.follow_newest",
    "ai.borrow_other_tier",
    "ai.credential_warn_days",
    "dispatch.cleaning.remove_quoted",
    "dispatch.knowledge.learn",
    "dispatch.knowledge.follow_on",
    "dispatch.knowledge.check_on_switch",
    "language.messages.greeting",
    "language.messages.actions_heading",
    "language.messages.closing",
    "language.messages.quiet_intro",
    "language.messages.quiet_subject",
    "language.messages.nudge_intro",
    "language.messages.nudge_intro_one",
    "language.messages.nudge_ask",
    "language.messages.nudge_ask_one",
    "language.messages.nudge_overdue",
    "language.messages.nudge_second_intro",
    "language.messages.nudge_second_ask",
    "language.messages.date_format",
    "language.messages.date_time_format",
    "language.self_words",
    "language.known_terms",
    "language.known_terms_shipped",
    "language.never_shown",
    "language.holiday_calendar",
    "language.rejecting_words",
    "language.limit_markings",
    "language.blocked_phrases",
    "ui.feedback_to",
    "ui.handled_group",
    "ui.today.mail_hours",
    "ui.today.agenda_days_ahead",
    "ui.today.schedule_days",
    "ui.today.stale_after_days",
    "ui.today.top_priorities_lines",
    "ui.followups.action_due_within_days",
    "ui.followups.undated_after_days",
    "ui.followups.question_after_days",
    "ui.notifications.message_one",
    "ui.notifications.message_many",
    "ui.notifications.test_message",
    "stages.moves",
    "watch.set_aside_defaults",
    "watch.automated_mail.set_aside",
    "watch.mail_kinds.enabled",
    "watch.sorting",
    "watch.acting",
    "watch.public_mail_domains_extra",
    "watch.handled_rule_section",
    "watch.stale_after_hours",
    "watch.default_data_level",
    "steward.tracks",
    "steward.reminders.missed",
    "steward.reminders.later_today_hours",
    "steward.reminders.evening",
    "steward.reminders.where",
    "steward.reminders.where_account",
    "steward.reminders.allowed_data",
    "steward.hold_outside_hours",
    "steward.brief.morning_from",
    "steward.brief.evening_from",
    "steward.brief.overnight_from",
    "steward.brief.weekly_day",
    "steward.brief.max_lines",
    "steward.brief.goals_min",
    "steward.brief.goals_max",
    "steward.brief.offer_reminders",
    "steward.meetings.prep_hours_before",
    "steward.meetings.capture_hours_after",
    "steward.people.quiet_promise_days",
    "steward.capacity.buffer_minutes",
    "steward.capacity.tentative_is_free",
    "steward.clashes.travel_minutes",
    "steward.attention.quiet",
    "steward.attention.daily_cap",
    "steward.dates.bookings_to_calendar",
    "steward.dates.suggest_reminders",
    "steward.dates.lead_days",
)

#: Fronts that are kept only in files. A longer advanced front above wins over a shorter front here.
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

#: Basic keys that are not in `engine.settings.BASIC`'s own first list: promoted here so the three kinds sit together.
BASIC_EXTRA = frozenset(
    {
        "workspace.project.personal",
        "workspace.project.business",
        "ui.notifications.quiet_hours.start",
        "ui.notifications.quiet_hours.end",
        "steward.default_stance",
        "steward.reminders.working_start",
        "steward.reminders.working_end",
        "steward.reminders.working_first_day",
        "steward.reminders.working_last_day",
        "steward.reminders.quiet_start",
        "steward.reminders.quiet_end",
        "steward.brief.enabled",
    }
)


def _front(key: str, fronts: tuple[str, ...]) -> int:
    """The length of the longest front of `fronts` that `key` is or sits under, or -1."""
    best = -1
    for front in fronts:
        if key == front or key.startswith(front + "."):
            best = max(best, len(front))
    return best


def level_of(key: str) -> str | None:
    """ "basic", "advanced", "internal", or None for a key no front places."""
    if key in BASIC_EXTRA:
        return "basic"
    adv, internal = _front(key, ADVANCED), _front(key, INTERNAL)
    if adv < 0 and internal < 0:
        return None
    return "advanced" if adv >= internal else "internal"


def apply(files: dict[str, type[BaseModel]]) -> None:
    """Put the marker on every field of the files' models that has none, from the fronts above."""
    seen: dict[tuple[type, str], str] = {}

    def walk(model: type[BaseModel], path: list[str]) -> None:
        for name, info in model.model_fields.items():
            here = [*path, name]
            inner = _model_of(info.annotation)
            if inner is not None:
                walk(inner, here)
                continue
            extra: dict[str, Any] = info.json_schema_extra if isinstance(info.json_schema_extra, dict) else {}
            if extra.get("internal") is True or extra.get("advanced") is True:
                continue
            level = level_of(".".join(here))
            if level in ("advanced", "internal"):
                if seen.get((model, name), level) != level:
                    raise RuntimeError(f"{'.'.join(here)} is shared by models that place it differently")
                seen[(model, name)] = level
                info.json_schema_extra = {**extra, level: True}

    for file, model in files.items():
        walk(model, [file])


def _model_of(annotation: Any) -> type[BaseModel] | None:
    return annotation if isinstance(annotation, type) and issubclass(annotation, BaseModel) else None
