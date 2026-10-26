# Settings sort, 2026-10-26

Where every setting of the app's own files is shown (design 7.9, change 210). Rule: basic is on screen, advanced is behind Advanced, internal is kept only in files. The markers are applied in `engine/config/levels.py` (fronts, longest wins) and `engine.settings.BASIC`; add-on settings keep their own markers. "More settings" is empty after this sort: every field is one of the three.
Counts: basic 32, advanced 155, files only 198.


| Field | Where | Why |
|---|---|---|
| `workspace.name` | basic | On screen first: what most people set in their first week. |
| `workspace.assistant_name` | basic | On screen first: what most people set in their first week. |
| `workspace.user.person` | advanced | Who you are on sources and how owners are written: set once, rarely changed. |
| `workspace.user.timezone` | basic | On screen first: what most people set in their first week. |
| `workspace.user.accounts` | advanced | Who you are on sources and how owners are written: set once, rarely changed. |
| `workspace.owner_format` | advanced | Who you are on sources and how owners are written: set once, rarely changed. |
| `workspace.language` | basic | On screen first: what most people set in their first week. |
| `workspace.project.summary_max_lines` | internal | Technical limit. |
| `workspace.project.completed_status` | advanced | Wording of how projects are sorted; rarely changed. |
| `workspace.project.personal` | basic | On screen first: what most people set in their first week. |
| `workspace.project.business` | basic | On screen first: what most people set in their first week. |
| `workspace.project.side_words.personal` | advanced | Wording of how projects are sorted; rarely changed. |
| `workspace.project.side_words.business` | advanced | Wording of how projects are sorted; rarely changed. |
| `workspace.plugins.enabled` | advanced | Add-on switch or feed address a person may add. |
| `workspace.plugins.actions.keep_minutes` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.actions.preview_mb` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.actions.max_previews` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.actions.max_items` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.actions.max_requests` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.tools.timeout_seconds` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.tools.max_timeout_seconds` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.tools.probe_timeout_seconds` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.tools.output_kb` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.tools.collect_file_mb` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.tools.collect_total_mb` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.jobs` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.secrets` | advanced | Reference to a secret; set in its own box. |
| `workspace.plugins.failures_before_off` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.catalog.enabled` | advanced | Add-on switch or feed address a person may add. |
| `workspace.plugins.catalog.shipped_feed` | advanced | Add-on switch or feed address a person may add. |
| `workspace.plugins.catalog.feeds` | advanced | Add-on switch or feed address a person may add. |
| `workspace.plugins.catalog.refresh_hours` | internal | Add-on host limit, timeout or catalog interval; technical. |
| `workspace.plugins.catalog.release_tokens` | advanced | Reference to a secret; set in its own box. |
| `workspace.contact_kinds` | internal | Technical or set by the program itself (the demo marker). |
| `workspace.phone_min_digits` | internal | Technical or set by the program itself (the demo marker). |
| `workspace.our_accounts` | advanced | Who you are on sources and how owners are written: set once, rarely changed. |
| `workspace.demo` | internal | Technical or set by the program itself (the demo marker). |
| `server.mode` | advanced | Where the app is served; changed by a person who deploys it. |
| `server.host` | internal | Address, port or path: the program and the deploy read it; a wrong value stops the app being reached. |
| `server.port` | internal | Address, port or path: the program and the deploy read it; a wrong value stops the app being reached. |
| `server.base_path` | advanced | Where the app is served; changed by a person who deploys it. |
| `server.public_url` | internal | Address, port or path: the program and the deploy read it; a wrong value stops the app being reached. |
| `server.open_browser` | advanced | Where the app is served; changed by a person who deploys it. |
| `storage.backend` | internal | Size limit, retry or interval; technical. |
| `storage.export.every_minutes` | advanced | Export and sync behaviour; rarely changed. |
| `storage.export.commit` | advanced | Export and sync behaviour; rarely changed. |
| `storage.export.remote` | internal | Size limit, retry or interval; technical. |
| `storage.backups.automatic` | basic | On screen first: what most people set in their first week. |
| `storage.backups.cloud_path` | internal | Size limit, retry or interval; technical. |
| `storage.backups.every_hours` | basic | On screen first: what most people set in their first week. |
| `storage.backups.keep` | basic | On screen first: what most people set in their first week. |
| `storage.backups.encrypt` | advanced | Export and sync behaviour; rarely changed. |
| `storage.backups.retry_minutes` | internal | Size limit, retry or interval; technical. |
| `storage.files.max_file_mb` | internal | Size limit, retry or interval; technical. |
| `storage.files.max_total_mb` | internal | Size limit, retry or interval; technical. |
| `storage.files.accepted_types` | advanced | Export and sync behaviour; rarely changed. |
| `storage.files.read_max_mb` | internal | Size limit, retry or interval; technical. |
| `storage.files.read_max_chars` | internal | Size limit, retry or interval; technical. |
| `storage.sync.folder` | basic | On screen first: what most people set in their first week. |
| `storage.sync.watch_outside_edits` | advanced | Export and sync behaviour; rarely changed. |
| `storage.sync.shared` | advanced | Export and sync behaviour; rarely changed. |
| `storage.sync.lease_stale_after_minutes` | internal | Size limit, retry or interval; technical. |
| `storage.kept_secrets.keep_days` | advanced | Export and sync behaviour; rarely changed. |
| `storage.kept_secrets.undo_grace_minutes` | advanced | Export and sync behaviour; rarely changed. |
| `ai.roles.write.tier` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.roles.write.same_account` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.roles.check.tier` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.roles.check.same_account` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.roles.research.tier` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.roles.research.same_account` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.budgets.per_run_usd` | basic | On screen first: what most people set in their first week. |
| `ai.budgets.confirm_unpriced` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.budgets.first_go` | basic | On screen first: what most people set in their first week. |
| `ai.budgets.confirm_above_usd` | basic | On screen first: what most people set in their first week. |
| `ai.budgets.per_day_usd` | basic | On screen first: what most people set in their first week. |
| `ai.budgets.per_month_usd` | basic | On screen first: what most people set in their first week. |
| `ai.budgets.warn_at` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.evaluation.runs` | internal | Measurement tuning for comparing models; developer tuning. |
| `ai.evaluation.min_score` | internal | Measurement tuning for comparing models; developer tuning. |
| `ai.evaluation.extra_allowance` | internal | Measurement tuning for comparing models; developer tuning. |
| `ai.skills.min_score` | internal | Measurement tuning for comparing models; developer tuning. |
| `ai.skills.stale_days` | internal | Measurement tuning for comparing models; developer tuning. |
| `ai.estimates.calibration_runs` | internal | Measurement tuning for comparing models; developer tuning. |
| `ai.models.follow_newest` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.models.check_every_days` | internal | Retry, wait or refresh interval; technical. |
| `ai.models.use_days` | internal | Retry, wait or refresh interval; technical. |
| `ai.catalog_refresh_hours` | internal | Retry, wait or refresh interval; technical. |
| `ai.rate_limits.tries` | internal | Retry, wait or refresh interval; technical. |
| `ai.rate_limits.max_wait_seconds` | internal | Retry, wait or refresh interval; technical. |
| `ai.rate_limits.pause_seconds` | internal | Retry, wait or refresh interval; technical. |
| `ai.borrow_other_tier` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `ai.credential_warn_days` | advanced | AI behaviour a setup person tunes: roles, warnings, fallback choice. |
| `dispatch.version` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.max_input_chars` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.fix_rounds` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.retries` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.retry_wait_seconds` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.offline_check_seconds` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.offline_line_after_minutes` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.no_work_tries` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.sleep_gap_seconds` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.cleaning.remove_quoted` | advanced | Switch for a learning behaviour the person may turn off. |
| `dispatch.cleaning.signature_markers` | internal | Pattern list for cleaning input; developer tuning. |
| `dispatch.cleaning.remove_patterns` | internal | Pattern list for cleaning input; developer tuning. |
| `dispatch.knowledge.glossary_all_below` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.facts_budget` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.routing_match` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.stable_budget` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.search_rounds` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.search_results` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.refusals_to_packet.share` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.refusals_to_packet.of_last` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.refusals_to_packet.min_runs` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.refusals_to_packet.floor` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.refusals_to_packet.floor_days` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.rule_review_days` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.rule_review_every_days` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.discards_hold_days` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.discard_similarity` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.proposals_expire_days` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.catch_up_max` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.learn` | advanced | Switch for a learning behaviour the person may turn off. |
| `dispatch.knowledge.learn_every_minutes` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.learn_input_chars` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.follow_on` | advanced | Switch for a learning behaviour the person may turn off. |
| `dispatch.knowledge.follow_on_max_tied` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.follow_on_match` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.check_on_switch` | advanced | Switch for a learning behaviour the person may turn off. |
| `dispatch.knowledge.new_terms_per_input` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.learn_later_inputs` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.quality_window_days` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.review_visit_max_seconds` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `dispatch.knowledge.min_corrections_per_week` | internal | Technical limit, retry count, timeout or tuning of the AI call path. |
| `checks.version` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.lints` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.projects` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.near_duplicate_action.similarity` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.near_duplicate_action.date_window_days` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.near_duplicate_question.similarity` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.near_duplicate_question.days` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.near_duplicate_meeting.similarity` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.near_duplicate_meeting.minutes` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.already_known.similarity` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.several_questions.minimum` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.owner_suggestion.match` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.unverified_quote.min_words` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.action_stands_alone.min_words` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `checks.tuning.long_quote.max_words` | internal | Similarity cut-off or word count of a check; developer tuning. |
| `language.version` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.messages.greeting` | advanced | Wording or word list in the person's own terms. |
| `language.messages.actions_heading` | advanced | Wording or word list in the person's own terms. |
| `language.messages.closing` | advanced | Wording or word list in the person's own terms. |
| `language.messages.quiet_intro` | advanced | Wording or word list in the person's own terms. |
| `language.messages.quiet_subject` | advanced | Wording or word list in the person's own terms. |
| `language.messages.nudge_intro` | advanced | Wording or word list in the person's own terms. |
| `language.messages.nudge_intro_one` | advanced | Wording or word list in the person's own terms. |
| `language.messages.nudge_ask` | advanced | Wording or word list in the person's own terms. |
| `language.messages.nudge_ask_one` | advanced | Wording or word list in the person's own terms. |
| `language.messages.nudge_overdue` | advanced | Wording or word list in the person's own terms. |
| `language.messages.nudge_second_intro` | advanced | Wording or word list in the person's own terms. |
| `language.messages.nudge_second_ask` | advanced | Wording or word list in the person's own terms. |
| `language.messages.called_off_notice` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.source_by_person` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.source_input` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.source_recorded` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.source_date_format` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.withheld_where` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.undo_no_answer` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.resourced_summary` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.resourced_label` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.withheld_name` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.folded_note` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.merged_note` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.merged_reason` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.folded_reason` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.link_not_read` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.part_of_meaning` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.part_of_reason` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.not_a_project_meaning` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.not_a_project_reason` | internal | Fixed sentence the program fills in; changing it breaks the places that read it. |
| `language.messages.date_format` | advanced | Wording or word list in the person's own terms. |
| `language.messages.date_time_format` | advanced | Wording or word list in the person's own terms. |
| `language.self_words` | advanced | Wording or word list in the person's own terms. |
| `language.internal_terms` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.rejecting_words` | advanced | Wording or word list in the person's own terms. |
| `language.owed_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.request_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.blocked_phrases` | advanced | Wording or word list in the person's own terms. |
| `language.unanchored_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.unanchored_lead_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.reasoning_phrases` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.singling_out_phrases` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.question_marks` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.ask_lead_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.asking_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.own_promise_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.claim_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.project_start_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.everyday_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.due_move_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.unassigned_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.promise_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.promise_state_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.team_promise_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.title_min_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.run_on_separators` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.rule_report_phrases` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.new_term_patterns` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.new_term_ignore` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.known_terms_shipped` | advanced | Wording or word list in the person's own terms. |
| `language.known_terms` | advanced | Wording or word list in the person's own terms. |
| `language.never_shown` | advanced | Wording or word list in the person's own terms. |
| `language.title_skip` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.reported_speech.verbs` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.reported_speech.lead_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.reported_speech.own_speakers` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.reported_speech.request_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.reported_speech.quote_min_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.reported_speech.chat_line_patterns` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.reported_speech.chat_min_lines` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.already_sent_phrases` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.due_lead_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.due_ordinal_suffixes` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.due_condition_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.due_hold_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.due_before_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.due_phrase_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.due_number_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.time_zone_abbreviations` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.holiday_calendar` | advanced | Wording or word list in the person's own terms. |
| `language.task_verbs` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.delivery_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.called_off_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.meeting_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.closed_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.limit_markings` | advanced | Wording or word list in the person's own terms. |
| `language.version_patterns` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.date_patterns` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.findings_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.made_phrases` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.name_skip_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `language.bare_confirmation_words` | internal | Word or pattern list the program reads to understand text; developer tuning. |
| `ui.narrow_below_px` | internal | Count, day window or layout limit; technical tuning. |
| `ui.toast_seconds` | basic | On screen first: what most people set in their first week. |
| `ui.feedback_to` | advanced | Display or notice choice that suits some people. |
| `ui.feedback_problem_days` | internal | Count, day window or layout limit; technical tuning. |
| `ui.feedback_problem_max` | internal | Count, day window or layout limit; technical tuning. |
| `ui.today.mail_hours` | advanced | What Today shows and when: its windows and counts; a person may want them different. |
| `ui.today.mail_max` | advanced | What Today shows and when: its windows and counts; a person may want them different. |
| `ui.today.agenda_days_ahead` | advanced | What Today shows and when: its windows and counts; a person may want them different. |
| `ui.today.stale_after_days` | advanced | What Today shows and when: its windows and counts; a person may want them different. |
| `ui.today.top_priorities_lines` | advanced | What Today shows and when: its windows and counts; a person may want them different. |
| `ui.today.top_priorities_ahead_days` | advanced | What Today shows and when: its windows and counts; a person may want them different. |
| `ui.followups.action_due_within_days` | advanced | When a follow-up is due: timings a person may want different. |
| `ui.followups.undated_after_days` | advanced | When a follow-up is due: timings a person may want different. |
| `ui.followups.question_after_days` | advanced | When a follow-up is due: timings a person may want different. |
| `ui.followups.second_nudge_items` | advanced | When a follow-up is due: timings a person may want different. |
| `ui.followups.escalate_after_chases` | advanced | When a follow-up is due: timings a person may want different. |
| `ui.walkthrough.first_promises` | advanced | How many items a screen shows. |
| `ui.series.usually_with_share` | advanced | How many items a screen shows. |
| `ui.series.usually_with_min_meetings` | advanced | How many items a screen shows. |
| `ui.series.usually_with_max` | advanced | How many items a screen shows. |
| `ui.brand.color` | basic | On screen first: what most people set in their first week. |
| `ui.brand.logo` | basic | On screen first: what most people set in their first week. |
| `ui.notifications.enabled` | basic | On screen first: what most people set in their first week. |
| `ui.notifications.browser` | basic | On screen first: what most people set in their first week. |
| `ui.notifications.webhook` | advanced | Display or notice choice that suits some people. |
| `ui.notifications.webhook_format` | advanced | Display or notice choice that suits some people. |
| `ui.notifications.quiet_hours.start` | basic | On screen first: what most people set in their first week. |
| `ui.notifications.quiet_hours.end` | basic | On screen first: what most people set in their first week. |
| `ui.notifications.retry_minutes` | internal | Count, day window or layout limit; technical tuning. |
| `ui.notifications.message_one` | advanced | Display or notice choice that suits some people. |
| `ui.notifications.message_many` | advanced | Display or notice choice that suits some people. |
| `ui.notifications.test_message` | advanced | Display or notice choice that suits some people. |
| `ui.theme` | basic | On screen first: what most people set in their first week. |
| `ui.density` | basic | On screen first: what most people set in their first week. |
| `stages.moves` | advanced | Who advances records. |
| `watch.set_aside_defaults` | advanced | Mail sorting choice or data level for a source. |
| `watch.automated_mail.version` | internal | Format version. |
| `watch.automated_mail.set_aside` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.automated_mail.senders` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.automated_mail.words` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.version` | internal | Format version. |
| `watch.mail_kinds.enabled` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.bill.version` | internal | Format version. |
| `watch.mail_kinds.bill.senders` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.bill.subject_words` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.bill.words` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.order.version` | internal | Format version. |
| `watch.mail_kinds.order.senders` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.order.subject_words` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.order.words` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.shipping.version` | internal | Format version. |
| `watch.mail_kinds.shipping.senders` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.shipping.subject_words` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.mail_kinds.shipping.words` | advanced | Which mail counts as automated, a bill, an order or a shipping notice: words a person may add to. |
| `watch.sorting` | advanced | Mail sorting choice or data level for a source. |
| `watch.acting` | advanced | Mail sorting choice or data level for a source. |
| `watch.propose_days` | advanced | How far or how many a proposal or look-back reaches. |
| `watch.propose_slots` | advanced | How far or how many a proposal or look-back reaches. |
| `watch.propose_round_minutes` | advanced | How far or how many a proposal or look-back reaches. |
| `watch.look_back_max_items` | advanced | How far or how many a proposal or look-back reaches. |
| `watch.sorting_batch` | internal | Sorting rule, word list, batch size or interval; technical. |
| `watch.set_aside_keep_seconds` | internal | Sorting rule, word list, batch size or interval; technical. |
| `watch.public_mail_domains_extra` | advanced | Mail sorting choice or data level for a source. |
| `watch.failures_before_asking` | internal | Sorting rule, word list, batch size or interval; technical. |
| `watch.unread_gap_factor` | internal | Sorting rule, word list, batch size or interval; technical. |
| `watch.stale_after_hours` | advanced | Mail sorting choice or data level for a source. |
| `watch.default_data_level` | advanced | Mail sorting choice or data level for a source. |
| `steward.version` | advanced | Daily steward choice: times, lead days, brief sections. |
| `steward.default_stance` | basic | On screen first: what most people set in their first week. |
| `steward.tracks` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.second_move_days` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.background_stuck_after_minutes` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.reminders.working_start` | basic | On screen first: what most people set in their first week. |
| `steward.reminders.working_end` | basic | On screen first: what most people set in their first week. |
| `steward.reminders.working_first_day` | basic | On screen first: what most people set in their first week. |
| `steward.reminders.working_last_day` | basic | On screen first: what most people set in their first week. |
| `steward.reminders.quiet_start` | basic | On screen first: what most people set in their first week. |
| `steward.reminders.quiet_end` | basic | On screen first: what most people set in their first week. |
| `steward.reminders.missed` | advanced | When reminders arrive: working days, hours, quiet hours, snooze and late times. |
| `steward.reminders.later_today_hours` | advanced | When reminders arrive: working days, hours, quiet hours, snooze and late times. |
| `steward.reminders.evening` | advanced | When reminders arrive: working days, hours, quiet hours, snooze and late times. |
| `steward.reminders.late_after_minutes` | advanced | When reminders arrive: working days, hours, quiet hours, snooze and late times. |
| `steward.reminders.where` | advanced | When reminders arrive: working days, hours, quiet hours, snooze and late times. |
| `steward.reminders.where_account` | advanced | When reminders arrive: working days, hours, quiet hours, snooze and late times. |
| `steward.reminders.look_ahead_hours` | advanced | When reminders arrive: working days, hours, quiet hours, snooze and late times. |
| `steward.reminders.allowed_data` | advanced | When reminders arrive: working days, hours, quiet hours, snooze and late times. |
| `steward.hold_outside_hours` | advanced | Daily steward choice: times, lead days, brief sections. |
| `steward.reply_thread_days` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.sent_match.window_days` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.sent_match.similarity` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.sent_match.ask_after_days` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.brief.enabled` | basic | On screen first: what most people set in their first week. |
| `steward.brief.morning_from` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.brief.evening_from` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.brief.overnight_from` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.brief.weekly_day` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.brief.max_lines` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.brief.goals_min` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.brief.goals_max` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.brief.offer_reminders` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.brief.remind_within_days` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.meetings.prep_hours_before` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.meetings.prep_min_open` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.meetings.capture_hours_after` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.meetings.max_items` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.meetings.setup_lead_working_days` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.meetings.setup_words` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.meetings.invitation_days_ahead` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.people.quiet_promise_days` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.people.max_facts` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.people.snooze_days` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.people.date_words` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.capacity.buffer_minutes` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.capacity.tentative_is_free` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.clashes.days_ahead` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.clashes.travel_minutes` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.attention.quiet` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.attention.daily_cap` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.attention.threshold` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.attention.importance.escalate` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.attention.importance.unfiled` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.attention.importance.stale` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.attention.importance.learned` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.attention.importance.catch_up` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.attention.importance.area` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.attention.importance.pattern` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.dates.bookings_to_calendar` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.dates.suggest_reminders` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.dates.lead_days.deadline` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.dates.lead_days.renewal` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.dates.lead_days.expiry` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.dates.lead_days.warranty` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.dates.lead_days.bill` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.areas.propose_after` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.capture.audio_kbps` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.capture.max_audio_mb` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.conversation.recent_turns` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.conversation.older_turn_chars` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.conversation.record_chars` | internal | Internal threshold, weight, window or size the program tunes; no person sets it. |
| `steward.patterns.moved_times` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.patterns.redated_times` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.patterns.owed_replies` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |
| `steward.patterns.snooze_days` | advanced | What the person sees and when: prep, clashes, brief, suggestions, dates, patterns. |

Not part of this sort: each file's `version`, and records or lists with a screen of their own (AI accounts, tiers, tasks, routing, prices and content levels; sources, triage and acting accounts; wording sheets; stages; rules; shortcuts; links; backup targets and cloud folders; `storage.backend` and `storage.export.remote`, which only files change).
