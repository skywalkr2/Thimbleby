# The visual hand-back tool

Takes a picture of every page and state of the built app at the reviewer's widths and themes, puts each beside its mockup in one
image, and writes a difference list to fill in. It is the "capture, put beside, list every difference" step of the reviewer's
hand-back rule (the sweep README, section 6).

It is not a test. It lives outside `web/e2e/`, so the browser test suite never picks it up, and it uses Playwright's library API.

## Run it

```
npm --prefix web run build                       # the tool captures the built app, and refuses a build older than web/src
npm --prefix web run visual:capture              # everything: about 16 pages and 60 states at five sizes
npm --prefix web run visual:capture -- --pages today,connections,setup-ai
```

Options (after `--`):

| Option | What it does |
|---|---|
| `--pages a,b` | The mockup pages to capture, from: today, today-review, today-states, todos, todos-states, schedule, schedule-states, connections, connections-states, person, person-states, quality, quality-states, setup-ai, setup-mail, setup-states. A states sheet is a page of its own. Default: all. A wrong name is an error. |
| `--with-states` | With a page, capture its states sheet too (`today` brings `today-states`; `setup-ai` and `setup-mail` bring `setup-states`). |
| `--sizes a,b` | Sizes like `1440-day,390-night`. Default: 1440 day, 1440 night, 1024 day, 390 day, 390 night. |
| `--out folder` | Where everything is written. Default `web/visual/out/` (ignored by git). It is emptied first. |
| `--ref ref` | The git ref the mockups are read from. Default `origin/claude/sweet-einstein-s840wp`. |
| `--inventory` | Captures every screen of the app (the map in `inventory.ts`) instead of the mockup pages; see "The inventory" below. `--pages` then names screens, and `--sizes` replaces each screen's own sizes. |
| `--strict` | Exit with 1 when a state that has a drive could not be reached. Without it the exit code is 0 and the state is listed. |

`PW_PORT_OFFSET` moves the servers' ports (they start at 8840, outside the ones `web/playwright.config.ts` uses) so two runs can share
a computer. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` names a browser, as for the browser tests.

## What it starts

The same stand-in servers the browser tests use, each in its own process group, stopped by that group's id when the tool ends
(also on an error or an interrupt). Their logs go to `<out>/servers/`.

- **accounts:** a workspace made by `cockpit init` with no template and the mail add-on on (`tests/e2e_fresh_server.py`), beside the
  stand-in outside services playing three people (`tests/fake_services.py --accounts 3`). It is captured in three stages, each
  adding to the last: `fresh` (nothing signed in, the setup guide still to do), `signed-in` (three accounts signed in through the
  service's own page, and read), and `failing` (the service withdraws the third account's sign-in, as `POST /__e2e/failing` does).
- **sides:** the long-name fixtures (`tests/e2e_server.py --many-sides`): Personal beside four sides, three with long names. Stages:
  `empty`, `seeded` (three people, one with a very long name, and eight to-dos, one with a very long title and one in another
  script) and `bulk` (120 more to-dos with titles in several scripts). Records are added through the app's own API.

## What it writes

```
<out>/<page>[-<state>]-<theme>-<width>.png            the build, full page
<out>/<page>[-<state>]-<theme>-390-screen.png         the first screen on a phone (the window, not the whole page)
<out>/side-by-side/<same name>                        the mockup on the left, the build on the right, at the same width
<out>/differences.md                                  one section per page and state, an empty table to fill in, and the states not driven
<out>/manifest.json                                   the same, as data
<out>/servers/*.log                                   what each server printed
```

- Night is chosen through the app's own theme choice, in the user menu, as a person picks it, and kept for that window.
- A state's capture is the whole screen in that state. Its mockup is the part of the states sheet's picture that holds that state,
  cut at the state's title; the sheet's page is drawn at the picture's width (with the app's own copies of the two typefaces the
  mockups name) to find where each state starts. If a title cannot be found the whole sheet is shown instead.
- The mockup pictures are read from git (`git show <ref>:<path>`) and are never copied into the app. There is no picture of a
  1024-wide night, so none is made at that size.
- A side-by-side is a small page drawn by the same browser and photographed; no image library is used.

## The capture map

`pages.ts` says, for each mockup page and each state of its states sheet, which server and stage it needs and how to reach it. The
ways a state is driven:

| State | How |
|---|---|
| Offline | `context.setOffline(true)` after the screen has loaded, then the app is told (offline and focus events) |
| A failed save | one write the screen sends is answered with a 500 by a route, then the screen's own button is pressed |
| Changed somewhere else | the same, with a 409 |
| A failing account | the stand-in service's `POST /__e2e/failing`, then "Read now" on the account's two connections |
| Loading | the app is opened on a screen that needs no data; every read it did not make to start is then held, and the screen is opened |
| Filtered to nothing | the side filter, on a side with nothing |
| 100+ items, other languages | the `bulk` stage adds 120 to-dos with titles in several scripts |
| Waiting for the sign-in window | the sign-in button is pressed and the service's window is left on its page |
| Couldn't load | the page's read is answered with a 500 |

A state the build cannot be put in with these fixtures is listed with its reason in `differences.md` (`undrivable` in the map), not
skipped. A drive that throws is listed too, with what it said, and the tool goes on; `--strict` turns those into exit code 1.

## Adding a page or a state

Add an entry to `ENTRIES` in `pages.ts` (the state's `title` is its title on the sheet, exactly) and, if it needs a server state
nobody has made yet, a stage in `stages.ts`. `names.test.ts` checks the map has every page, each entry has a drive or a reason, and
the names match the reviewer's pictures: `npm --prefix web test -- --run visual`.

## The inventory

`npm --prefix web run visual:capture -- --inventory --out <folder>` captures every screen of the app, with or without a mockup, for a
reviewer who scores each screen from pictures. `inventory.ts` is its map, in the shape of `pages.ts`: one entry per screen (its id,
label, group, the server and stage it needs, and the clicks that reach it), and an entry per state where a shared state applies
(Loading, Couldn't load, Offline, Filtered to nothing). It covers Today and its review, the work screens (with the Follow-ups tabs and
the To-dos and Questions tabs), the Schedule's five views, the records and their pages, Handover, Quality, every Settings section, every
setup step, and the header's menus, the More sheet and the drawers and dialogs.

```
<out>/<screen>[-<state>]-<theme>-<width>.png    the whole screen, at 1440 day, 1440 night, 1024 day and 390 day
                                                 (and 390 night for the main screens, those marked `main`)
<out>/index.md                                   every screen and state with links to its pictures, then the ones not captured, with reasons
<out>/manifest.json                              the same, as data
```

There are no mockups to put beside these, so no side-by-side images and no `differences.md` are written, and a phone's first-screen
picture is not taken. An entry may be limited to the widths where it exists (`widths`: the phone's More sheet). A dialog, drawer, sheet or menu (`window`, the `OVERLAYS` list in `inventory.ts`) is photographed as the window shows it, not as the whole page, so its scrim covers what a person sees. A screen that can't be
reached (`undrivable`, or a drive that throws `Unreachable`) is listed in `index.md` with its reason; `--strict` makes a drive that
failed exit with 1. Data a screen needs and the servers lack is added through the app's own API in `stages.ts` (the `filled` stage of
the sides server adds two organizations, one with a very long name). Add a screen by adding an entry to `build()` in `inventory.ts`;
`names.test.ts` checks every entry has a drive or a reason and that the reviewer's list of screens is there.
