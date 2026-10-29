// The style guide (design 7.11): every shared component in every state, the type scale and the color roles, in light and
// dark. It is shown only for a demo workspace or in development, and is not in the sidebar (#styleguide).
import { useEffect, useId, useState } from "react";
import { Button as AriaButton, Dialog, DialogTrigger, Heading } from "react-aria-components";
import { addDays, todayOn } from "../lib/dates";
import { applyTheme, useAppearance, type Theme } from "../lib/theme";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { EmptyState } from "../ui/EmptyState";
import { ICON_NAMES, Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";
import { LoadFailed } from "../ui/LoadFailed";
import { MenuButton } from "../ui/MenuButton";
import { Panel } from "../ui/Panel";
import { Pill } from "../ui/Pill";
import { FilterChip } from "../ui/FilterChip";
import { RoundCheck } from "../ui/RoundCheck";
import { ExpandableRow, Row } from "../ui/Row";
import { RowBody } from "../ui/RowBody";
import { TabStrip } from "../ui/TabStrip";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Skeleton } from "../ui/Skeleton";
import { StatusChip } from "../ui/StatusChip";
import { ModalPanel, restoreFocus, DialogFooter } from "./ModalPanel";
import styles from "./StyleGuide.module.css";

import { ActivityList } from "../ui/ActivityList";
import { AskAboutThis } from "../ui/AskAboutThis";
import { CheckboxGroup } from "../ui/CheckboxGroup";
import { DateField } from "../ui/DateField";
import { Definition, DefinitionList } from "../ui/DefinitionList";
import { FileDrop } from "../ui/FileDrop";
import { FormField } from "../ui/FormField";
import { BottomSheet } from "../ui/Overlay";
import { PageHeader } from "../ui/PageHeader";
import { Popover } from "../ui/Popover";
import { RadioCard, RadioCards } from "../ui/RadioCard";
import { Select } from "../ui/Select";
import { StepFooter } from "../ui/Wizard";
const TYPE_SCALE = [
  { token: "text-2xl", weight: "semibold" },
  { token: "text-xl", weight: "semibold" },
  { token: "text-lg", weight: "semibold" },
  { token: "text-section", weight: "semibold" },
  { token: "text-md", weight: "semibold" },
  { token: "text-md", weight: "regular" },
  { token: "text-sm", weight: "medium" },
  { token: "text-meta", weight: "regular" },
  { token: "text-xs", weight: "semibold" },
] as const;

/** The color roles: the token that fills them, the one drawn on top, and what each is for. */
const ROLES = [
  { token: "canvas", on: "text", use: "canvas" },
  { token: "surface", on: "text", use: "surface" },
  { token: "surface-sunk", on: "text-muted", use: "sunk" },
  { token: "accent", on: "text-on-accent", use: "accent" },
  { token: "accent-soft", on: "accent-text", use: "accent_soft" },
  { token: "warn-soft", on: "warn", use: "warn" },
  { token: "danger-soft", on: "danger", use: "danger" },
  { token: "ok-soft", on: "ok", use: "ok" },
  { token: "mark", on: "mark-text", use: "mark" },
] as const;

const WEIGHT = { regular: "var(--weight-regular)", medium: "var(--weight-medium)", semibold: "var(--weight-semibold)" } as const;

function Section(props: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Panel title={props.title}>
      <div className={styles.stack}>
        {props.note && <p className={styles.caption}>{props.note}</p>}
        {props.children}
      </div>
    </Panel>
  );
}

export function StyleGuide() {
  const { t } = useWords();
  const { push } = useToasts();
  const device = useAppearance();
  const [theme, setThemeShown] = useState<Theme>(device.theme);
  const [filter, setFilter] = useState("send");
  const [tab, setTab] = useState("a");
  const [who, setWho] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState("");
  const [choice, setChoice] = useState("a");
  const [card, setCard] = useState("a");
  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState(true);
  const [ask, setAsk] = useState("");
  const today = todayOn(new Date());
  const activity = [
    { key: "a", at: `${today}T10:42:00`, body: t("styleguide.activity_a") },
    { key: "b", at: `${today}T09:15:00`, body: t("styleguide.activity_b") },
    { key: "c", at: `${addDays(today, -1)}T16:20:00`, body: t("styleguide.activity_c") },
    { key: "d", at: `${addDays(today, -1)}T11:05:00`, body: t("styleguide.activity_d") },
    { key: "e", at: `${addDays(today, -3)}T08:30:00`, body: t("styleguide.activity_e") },
    { key: "f", at: `${addDays(today, -4)}T14:00:00`, body: t("styleguide.activity_f") },
  ];
  const fieldId = useId();

  // The page's own theme toggle shows both themes without changing what this device remembers.
  useEffect(() => {
    applyTheme(theme);
    return () => applyTheme(device.theme);
  }, [theme, device.theme]);

  return (
    <div className={styles.page}>
      <PageHeader
        title={t("styleguide.title")}
        filters={
          <SegmentedControl<Theme>
            label={t("styleguide.theme")}
            value={theme}
            onChange={setThemeShown}
            options={(["system", "light", "dark"] as Theme[]).map((id) => ({ value: id, label: t(`user.theme.${id}`) }))}
          />
        }
      />

      <Section title={t("styleguide.type")} note={t("styleguide.type_note")}>
        <div className={styles.scale}>
          {TYPE_SCALE.map((row) => (
            <div key={`${row.token}-${row.weight}`} className={styles.scaleRow}>
              <span className={styles.token}>
                --{row.token} · {row.weight}
              </span>
              <span style={{ fontSize: `var(--${row.token})`, lineHeight: `var(--lh-${row.token.slice(5)})`, fontWeight: WEIGHT[row.weight] }}>{t("styleguide.sample_text")}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("styleguide.colors")} note={t("styleguide.colors_note")}>
        <div className={styles.swatches}>
          {ROLES.map((role) => (
            <div key={role.token} className={styles.swatch} style={{ background: `var(--${role.token})`, color: `var(--${role.on})` }}>
              <span className={styles.token} style={{ color: "inherit" }}>
                --{role.token}
              </span>
              <span>{t(`styleguide.role.${role.use}`)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("styleguide.buttons")} note={t("styleguide.buttons_note")}>
        <div className={styles.demo}>
          <Button variant="primary">{t("styleguide.primary")}</Button>
          <Button>{t("styleguide.secondary")}</Button>
          <Button variant="quiet">{t("styleguide.ghost")}</Button>
          <Button variant="danger">{t("styleguide.danger")}</Button>
          <Button variant="primary" size="sm">
            {t("styleguide.small")}
          </Button>
          <Button icon="plus" variant="primary">
            {t("styleguide.with_icon")}
          </Button>
          <Button loading variant="primary">
            {t("styleguide.loading")}
          </Button>
          <Button loading>{t("styleguide.loading")}</Button>
        </div>
        <div className={styles.demo}>
          <Button variant="primary" disabled reason={t("styleguide.reason")}>
            {t("styleguide.primary")}
          </Button>
          <Button disabled reason={t("styleguide.reason")}>
            {t("styleguide.secondary")}
          </Button>
          <Button variant="quiet" disabled>
            {t("styleguide.ghost")}
          </Button>
          <Button variant="danger" disabled reason={t("styleguide.reason")}>
            {t("styleguide.danger")}
          </Button>
        </div>
        <div className={styles.demo}>
          <IconButton icon="help" label={t("styleguide.icon_help")} />
          <IconButton icon="refresh" label={t("styleguide.icon_refresh")} variant="secondary" />
          <IconButton icon="close" label={t("styleguide.icon_close")} size="sm" />
          <IconButton icon="more" label={t("styleguide.icon_more")} isDisabled />
        </div>
      </Section>

      <Section title={t("styleguide.pills")} note={t("styleguide.pills_note")}>
        <div className={styles.demo}>
          <Pill>{t("styleguide.pill_neutral")}</Pill>
          <Pill tone="need">{t("styleguide.pill_need")}</Pill>
          <Pill tone="warn">{t("styleguide.pill_warn")}</Pill>
          <Pill tone="danger">{t("styleguide.pill_danger")}</Pill>
          <Pill tone="ok">{t("styleguide.pill_ok")}</Pill>
          <StatusChip aria-label={t("styleguide.chip_live")}>{t("styleguide.chip_live")}</StatusChip>
          <StatusChip tone="warn" aria-label={t("styleguide.chip_warn")}>
            {t("styleguide.chip_warn")}
          </StatusChip>
          <StatusChip tone="danger" aria-label={t("styleguide.chip_danger")}>
            {t("styleguide.chip_danger")}
          </StatusChip>
        </div>
      </Section>

      <Panel title={t("styleguide.rows")} count={6} flush>
        <ul className={styles.list}>
          <Row
            lead={<RoundCheck label={t("styleguide.row_lead_check")} onClick={() => undefined} />}
            title={t("styleguide.row_lead")}
            meta={t("styleguide.row_lead_meta")}
            menu={<MenuButton groups={[{ id: "a", entries: [{ id: "x", label: t("styleguide.menu_item") }] }]} trigger={<IconButton icon="more" size="sm" label={t("styleguide.icon_more")} tooltip={false} />} />}
          />
          <Row
            pill={<Pill tone="need">{t("styleguide.pill_need")}</Pill>}
            title={t("styleguide.row_title")}
            meta={t("styleguide.row_meta")}
            primary={<Button variant="primary" size="sm">{t("styleguide.row_primary")}</Button>}
            menu={<MenuButton groups={[{ id: "a", entries: [{ id: "x", label: t("styleguide.menu_item") }] }]} trigger={<IconButton icon="more" size="sm" label={t("styleguide.icon_more")} tooltip={false} />} />}
          />
          <Row
            selected
            pill={<Pill tone="warn">{t("styleguide.pill_warn")}</Pill>}
            title={t("styleguide.row_title")}
            meta={t("styleguide.row_meta")}
            primary={<Button variant="primary" size="sm">{t("styleguide.row_primary")}</Button>}
          />
          <Row title={t("styleguide.row_long")} meta={t("styleguide.row_meta")} primary={<Button size="sm">{t("styleguide.row_primary")}</Button>} />
          <Row pill={<Pill tone="danger">{t("styleguide.pill_danger")}</Pill>} title={t("styleguide.row_title")}>
            <p className={styles.caption}>{t("styleguide.row_expanded")}</p>
          </Row>
          <ExpandableRow
            title={t("styleguide.row_expand")}
            titleId={`${fieldId}-expand`}
            aria-labelledby={`${fieldId}-expand`}
            meta={t("styleguide.row_expand_meta")}
            expand={{ expanded: open, controls: `${fieldId}-expand-body`, onToggle: () => setOpen(!open) }}
            primary={<Button variant="primary" size="sm">{t("styleguide.row_primary")}</Button>}
          >
            {open && (
              <RowBody id={`${fieldId}-expand-body`}>
                <p className={styles.caption}>{t("styleguide.row_expanded")}</p>
              </RowBody>
            )}
          </ExpandableRow>
        </ul>
      </Panel>

      <Section title={t("styleguide.header")} note={t("styleguide.header_note")}>
        <PageHeader
          level={3}
          title={t("styleguide.header_title")}
          kind={<Pill>{t("styleguide.header_kind")}</Pill>}
          subtitle={t("styleguide.header_sub")}
          primary={<Button variant="primary" icon="plus">{t("styleguide.header_primary")}</Button>}
          tabs={
            <TabStrip
              label={t("styleguide.tabs_label")}
              value={tab}
              onChange={setTab}
              options={[
                { value: "a", label: t("styleguide.tab_a"), count: 6 },
                { value: "b", label: t("styleguide.tab_b"), count: 0 },
              ]}
            />
          }
          filters={
            <>
              <FilterChip label={t("styleguide.chip_who")} value={who} onChange={setWho} options={[["", t("styleguide.chip_everyone")], ["robin", t("styleguide.chip_robin")]]} />
              <FilterChip label={t("styleguide.chip_state")} value="open" onChange={() => undefined} options={[["open", t("styleguide.chip_open")], ["all", t("styleguide.chip_all")]]} />
            </>
          }
        />
      </Section>

      <Section title={t("styleguide.links")} note={t("styleguide.links_note")}>
        <div className={styles.stack}>
          <p>
            {t("styleguide.link_sentence")} <a href="#styleguide">{t("styleguide.link_alone")}</a>
          </p>
          <div>
            <a href="#styleguide">{t("styleguide.link_alone")}</a>
          </div>
          <ul className={styles.list}>
            <Row title={<a href="#styleguide">{t("styleguide.link_name")}</a>} meta={t("styleguide.row_meta")} />
          </ul>
        </div>
      </Section>

      <Section title={t("styleguide.segmented")}>
        <div className={styles.demo}>
          <SegmentedControl
            label={t("styleguide.segmented")}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "send", label: t("styleguide.seg_a") },
              { value: "waiting", label: t("styleguide.seg_b") },
              { value: "all", label: t("styleguide.seg_c") },
            ]}
          />
        </div>
      </Section>

      <Section title={t("styleguide.states")} note={t("styleguide.states_note")}>
        <div className={styles.stack}>
          <Panel title={t("styleguide.empty")} small>
            <EmptyState icon="inbox" text={t("styleguide.empty_text")} action={{ label: t("styleguide.empty_action"), onClick: () => undefined }} />
          </Panel>
          <Panel title={t("styleguide.empty_title")} small>
            <EmptyState icon="folder" title={t("styleguide.empty_title")} text={t("styleguide.empty_titled_text")} action={{ label: t("styleguide.empty_titled_action"), onClick: () => undefined, primary: true }} />
          </Panel>
          <Panel title={t("styleguide.empty_inline")} small>
            <EmptyState inline text={t("styleguide.empty_inline_text")} action={{ label: t("styleguide.empty_inline_action"), onClick: () => undefined }} />
          </Panel>
          <Panel title={t("styleguide.failed")} small>
            <LoadFailed message={t("styleguide.failed_text")} detail={t("styleguide.failed_detail")} onRetry={() => undefined} />
          </Panel>
          <Panel title={t("styleguide.skeleton")} small flush>
            <Skeleton rows={3} />
          </Panel>
        </div>
      </Section>

      <Section title={t("styleguide.floating")} note={t("styleguide.floating_note")}>
        <div className={styles.demo}>
          <Button
            id="styleguide-drawer"
            onClick={() => {
              setDraft("");
              setDrawer(true);
            }}
          >
            {t("styleguide.open_drawer")}
          </Button>
          <Button id="styleguide-dialog" onClick={() => setDialog(true)}>
            {t("styleguide.open_dialog")}
          </Button>
          <MenuButton
            placement="bottom start"
            groups={[
              { id: "one", entries: [{ id: "a", label: t("styleguide.menu_item"), icon: "check" }, { id: "b", label: t("styleguide.menu_disabled"), disabled: true, reason: t("styleguide.reason") }] },
              { id: "drop", entries: [{ id: "c", label: t("styleguide.menu_danger"), danger: true }] },
              { id: "two", title: t("user.theme"), selected: "light", entries: [{ id: "light", label: t("user.theme.light"), icon: "sun" }, { id: "dark", label: t("user.theme.dark"), icon: "moon" }] },
            ]}
            trigger={<Button icon="chevron-down">{t("styleguide.open_menu")}</Button>}
          />
          <Button id="styleguide-sheet" onClick={() => setSheet(true)}>
            {t("styleguide.open_sheet")}
          </Button>
          <DialogTrigger>
            <AriaButton className={styles.trigger}>
              <Icon name="help" size={16} /> {t("styleguide.open_popover")}
            </AriaButton>
            <Popover label={t("styleguide.popover_title")} columns={2}>
              <ul className={styles.popoverList}>
                <li>
                  <strong>{t("styleguide.popover_a")}</strong>
                  <p className={styles.caption}>{t("styleguide.popover_a_text")}</p>
                </li>
                <li>
                  <strong>{t("styleguide.popover_b")}</strong>
                  <p className={styles.caption}>{t("styleguide.popover_b_text")}</p>
                </li>
              </ul>
            </Popover>
          </DialogTrigger>
          <Button onClick={() => push({ message: t("styleguide.toast"), undo: () => undefined })}>{t("styleguide.show_toast")}</Button>
          <Button onClick={() => push({ message: t("styleguide.toast_warn"), tone: "warn" })}>{t("styleguide.show_toast_warn")}</Button>
          <Button
            onClick={() => {
              push({ message: t("styleguide.toast"), undo: () => undefined });
              push({ message: t("styleguide.toast_b"), undo: () => undefined });
              // Several choices and an Undo: the buttons wrap under the words, which keep a width that reads.
              push({
                message: t("styleguide.toast_c"),
                action: { label: t("styleguide.toast_c_action"), run: () => undefined },
                more: [{ label: t("styleguide.toast_c_more"), run: () => undefined }],
                undo: () => undefined,
              });
            }}
          >
            {t("styleguide.show_toasts")}
          </Button>
        </div>
      </Section>

      <Section title={t("styleguide.forms")} note={t("styleguide.forms_note")}>
        <div className={styles.form}>
          <FormField id={`${fieldId}-a`} label={t("styleguide.field")}>
            <input id={`${fieldId}-a`} placeholder={t("styleguide.placeholder")} />
            <p className="hint">{t("styleguide.hint")}</p>
          </FormField>
          <FormField id={`${fieldId}-b`} label={t("styleguide.field_error")}>
            <input id={`${fieldId}-b`} className={styles.invalid} defaultValue={t("styleguide.value")} aria-invalid="true" aria-describedby={`${fieldId}-e`} />
            <p id={`${fieldId}-e`} className={styles.error}>
              {t("styleguide.error")}
            </p>
          </FormField>
          <FormField id={`${fieldId}-c`} label={t("styleguide.field_disabled")}>
            <input id={`${fieldId}-c`} disabled defaultValue={t("styleguide.value")} />
          </FormField>
          <FormField id={`${fieldId}-d`} label={t("styleguide.field_select")}>
            <Select id={`${fieldId}-d`}>
              <option>{t("styleguide.seg_a")}</option>
              <option>{t("styleguide.seg_b")}</option>
            </Select>
          </FormField>
          <FormField id={`${fieldId}-f`} label={t("styleguide.field_text")}>
            <textarea id={`${fieldId}-f`} className="short" />
          </FormField>
          <FormField id={`${fieldId}-h`} label={t("styleguide.field_date")} optional hint={t("styleguide.field_date_hint")}>
            <DateField id={`${fieldId}-h`} aria-describedby={`${fieldId}-h-hint`} />
          </FormField>
          <FormField id={`${fieldId}-i`} label={t("styleguide.field_file")}>
            <FileDrop id={`${fieldId}-i`} />
          </FormField>
          <CheckboxGroup legend={t("styleguide.group")} hint={t("styleguide.group_hint")}>
            <div className={styles.choiceRow}>
              <label className={styles.choice}>
                <input type="checkbox" defaultChecked /> {t("styleguide.check_on")}
              </label>
              <label className={styles.choice}>
                <input type="checkbox" /> {t("styleguide.check_off")}
              </label>
              <label className={styles.choice}>
                <input type="checkbox" disabled /> {t("styleguide.check_disabled")}
              </label>
            </div>
          </CheckboxGroup>
          <CheckboxGroup legend={t("styleguide.group_radio")} role="radiogroup">
            <div className={styles.choiceRow}>
              <label className={styles.choice}>
                <input type="radio" name={`${fieldId}-r`} checked={choice === "a"} onChange={() => setChoice("a")} /> {t("styleguide.seg_a")}
              </label>
              <label className={styles.choice}>
                <input type="radio" name={`${fieldId}-r`} checked={choice === "b"} onChange={() => setChoice("b")} /> {t("styleguide.seg_b")}
              </label>
            </div>
          </CheckboxGroup>
          <CheckboxGroup legend={t("styleguide.cards")} hint={t("styleguide.cards_hint")} role="radiogroup">
            <RadioCards>
              <RadioCard name={`${fieldId}-c`} checked={card === "a"} onChange={() => setCard("a")} tag={t("styleguide.card_tag")} title={t("styleguide.card_a")} description={t("styleguide.card_a_text")} />
              <RadioCard name={`${fieldId}-c`} checked={card === "b"} onChange={() => setCard("b")} title={t("styleguide.card_b")} description={t("styleguide.card_b_text")} />
              <RadioCard name={`${fieldId}-c`} disabled title={t("styleguide.card_c")} description={t("styleguide.card_c_text")} />
            </RadioCards>
          </CheckboxGroup>
        </div>
      </Section>

      <Section title={t("styleguide.record")} note={t("styleguide.record_note")}>
        <div className={styles.stack}>
          <DefinitionList>
            <Definition>
              <dt>{t("styleguide.def_role")}</dt>
              <dd>{t("styleguide.def_role_value")}</dd>
            </Definition>
            <Definition>
              <dt>{t("styleguide.def_side")}</dt>
              <dd>{t("styleguide.def_side_value")}</dd>
            </Definition>
            <Definition>
              <dt>{t("styleguide.def_birthday")}</dt>
              <dd>{t("styleguide.def_birthday_value")}</dd>
            </Definition>
          </DefinitionList>
          <ActivityList label={t("styleguide.activity")} entries={activity} />
          <AskAboutThis
            label={t("styleguide.ask_label")}
            placeholder={t("styleguide.ask_placeholder")}
            hint={t("styleguide.ask_hint")}
            sendLabel={t("conversation.send")}
            value={ask}
            onChange={setAsk}
            onSend={() => setAsk("")}
          />
        </div>
      </Section>

      <Section title={t("styleguide.wizard")} note={t("styleguide.wizard_note")}>
        <div className={styles.footDemo}>
          <StepFooter
            inFlow
            back={<Button variant="quiet">{t("styleguide.wizard_back")}</Button>}
            later={<Button variant="quiet">{t("styleguide.wizard_later")}</Button>}
            primary={<Button variant="primary">{t("styleguide.wizard_next")}</Button>}
          />
        </div>
      </Section>

      <Section title={t("styleguide.evidence")} note={t("styleguide.evidence_note")}>
        <div className={styles.stack}>
          <p className="because">
            {t("styleguide.because")} <q>{t("styleguide.quote")}</q> <a href="#styleguide">{t("styleguide.source")}</a>
          </p>
          <div className="source">
            <p className="src">
              {t("styleguide.source_from")} <Pill>{t("styleguide.outside")}</Pill>
            </p>
            <p>
              {t("styleguide.source_before")} <mark>{t("styleguide.source_marked")}</mark> {t("styleguide.source_after")}
            </p>
          </div>
        </div>
      </Section>

      <Section title={t("styleguide.icons")} note={t("styleguide.icons_note")}>
        <div className={styles.icons}>
          {ICON_NAMES.map((name) => (
            <div key={name} className={styles.icon}>
              <Icon name={name} size={18} />
              <span className={styles.token}>{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Drawer open={drawer} title={t("styleguide.drawer_title")} dirty={draft !== ""} onClose={() => { setDrawer(false); }} footer={<Button variant="primary" onClick={() => setDrawer(false)}>{t("styleguide.drawer_save")}</Button>}>
        <FormField id={`${fieldId}-g`} label={t("styleguide.field_text")}>
          <textarea id={`${fieldId}-g`} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <p className="hint">{t("styleguide.drawer_hint")}</p>
        </FormField>
      </Drawer>
      {sheet && (
        <BottomSheet
          onClose={() => {
            setSheet(false);
            restoreFocus(() => document.getElementById("styleguide-sheet"));
          }}
        >
          <Dialog aria-label={t("styleguide.sheet_title")}>
            <Heading slot="title" className={styles.sheetTitle}>
              {t("styleguide.sheet_title")}
            </Heading>
            <p>{t("styleguide.sheet_text")}</p>
            <Button onClick={() => setSheet(false)}>{t("action.close")}</Button>
          </Dialog>
        </BottomSheet>
      )}
      {dialog && (
        <ModalPanel
          titleId="styleguide-dialog-title"
          onClose={() => {
            setDialog(false);
            restoreFocus(() => document.getElementById("styleguide-dialog"));
          }}
        >
          <Heading slot="title" id="styleguide-dialog-title">
            {t("styleguide.dialog_title")}
          </Heading>
          <p>{t("styleguide.dialog_text")}</p>
          <DialogFooter>
            <Button
              onClick={() => {
                setDialog(false);
                restoreFocus(() => document.getElementById("styleguide-dialog"));
              }}
            >
              {t("action.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDialog(false);
                restoreFocus(() => document.getElementById("styleguide-dialog"));
              }}
            >
              {t("styleguide.danger")}
            </Button>
          </DialogFooter>
        </ModalPanel>
      )}
    </div>
  );
}
