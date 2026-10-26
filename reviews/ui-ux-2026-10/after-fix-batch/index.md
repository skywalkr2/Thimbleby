# Captures after the fix batch

File names: `<screen>-<mode>-<width>.jpg`, mode `day` or `night`, width `1440` or `390`. Each screen below has all four.

Main screens are on the demo workspace (demo-b); setup steps and the Personal project are on a fresh workspace made with no template, served with the fake outside services. Nothing was filled in or saved.

Not captured: the Set aside list (the demo has no mail set aside, so there was no folder to open).

Full-page shots: the side bar is drawn only to window height, so below that it looks cut off; that is the capture, not the app.

## Run again
From the repository root, after `npm --prefix web run build`:
```
cd web && PW_PORT_OFFSET=40 NODE_PATH=$PWD/node_modules npx playwright test -c ../reviews/ui-ux-2026-10/after-fix-batch/playwright.config.ts
```
It starts its own servers (about 8 minutes).

## Captures
- `addons`: Add-ons
- `hand-in-drawer`: Hand something in drawer open over Today
- `handover`: Handover
- `person`: A person page (demo data)
- `project-business`: A business project page (demo data)
- `project-personal`: The Personal project page (fresh workspace)
- `quality`: Quality
- `records-files`: Files
- `records-knowledge`: Knowledge
- `records-people`: People list
- `records-projects`: Projects list
- `settings-advanced`: Settings: Advanced
- `settings-ai`: Settings: AI accounts
- `settings-ai-compare`: Settings: what each AI account can do
- `settings-appearance`: Settings: Appearance
- `settings-backups`: Settings: Backups
- `settings-connections`: Settings: Connections, opened from the Settings side bar
- `settings-files`: Settings: Files
- `settings-lists`: Settings: Lists
- `settings-today`: Settings: Today
- `settings-you`: Settings: You
- `setup-ai`: Setup step 2, Your AI account
- `setup-backup`: Setup step 5, Backups
- `setup-done`: Setup step 7, Done
- `setup-mail`: Setup step 3, Mail and calendar, with the add-on line
- `setup-people`: Setup step 6, People
- `setup-promises`: Setup step 4, Your promises
- `setup-you`: Setup step 1, You, before filling in
- `sources`: Connections screen
- `status-popover`: App status popover open over Today
- `today`: Today, the home screen
- `work-changed`: What changed
- `work-followups`: Follow-ups
- `work-open`: To-dos and questions
- `work-outgoing`: Waiting to go out
- `work-stages`: Stages
