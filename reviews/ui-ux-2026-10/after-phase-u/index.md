# Captures after phase U (the UI/UX review of 45f7102, built)

File names: `<screen>-<mode>-<width>.jpg`, mode `day` or `night`, width `1440` or `390`. Each screen below has all four.

Main screens are on the demo workspace (demo-b, which has no business side, so the Your business page and the side
filter don't show here; the setup captures show the What it's for step). Setup steps and the Personal project are on a
fresh workspace made with no template, served with the fake outside services. Nothing was filled in or saved.

Full-page shots: the side bar is drawn only to window height, so below that it looks cut off; that is the capture, not
the app.

## Screens
- `hand-in-drawer`
- `handover`
- `person`
- `project-business`
- `project-personal`
- `quality`
- `records-files`
- `records-knowledge`
- `records-people`
- `records-projects`
- `schedule`
- `settings-addons`
- `settings-advanced`
- `settings-ai`
- `settings-ai-compare`
- `settings-appearance`
- `settings-backups`
- `settings-connections`
- `settings-files`
- `settings-lists`
- `settings-today`
- `settings-you`
- `setup-ai`
- `setup-backup`
- `setup-done`
- `setup-mail`
- `setup-people`
- `setup-promises`
- `setup-welcome`
- `setup-work`
- `setup-you`
- `status-popover`
- `today`
- `work-changed`
- `work-followups`
- `work-handled`
- `work-open`
- `work-stages`

## Run again
From the repository root, after `npm --prefix web run build`:
```
cd web && PW_PORT_OFFSET=40 NODE_PATH=$PWD/node_modules npx playwright test -c ../reviews/ui-ux-2026-10/after-phase-u/playwright.config.ts
```
`CAP_SETUP_ONLY=1` shoots only the setup steps; `CAP_SCREENS=<name>,<name>` shoots those screens again with them.
