// The two appearance settings that are not text: the accent color is picked from the browser's own color control with a
// plain-words note on how easy it is to see, and the logo is a picture uploaded from the person's computer, kept with the
// settings, never a file name typed in (design 7.9, 7.12).
import { useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { accentContrast, contrast, parseHex } from "../lib/theme";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { FileDrop } from "../ui/FileDrop";

/** What the person is told about a color: how easily it is seen on white (outlines and icons in it), and whether the text
 * on a button in it is easy to read. Never a standard's name or a ratio. */
export function BrandContrast(props: { color: string }) {
  const { t } = useWords();
  if (!parseHex(props.color)) return null;
  const text = accentContrast(props.color);
  const faint = contrast(props.color, "#ffffff") < 3;
  const problems = [faint ? t("brand.hard_on_white") : "", text && !text.ok ? t("brand.hard_on_buttons") : ""].filter(Boolean);
  return (
    <p className={problems.length ? "problem-note" : "hint"} role="status" aria-label={t("brand.contrast_title")}>
      {problems.length ? problems.join(" ") : t("brand.easy_to_read")}
    </p>
  );
}

const APP_COLOR = "#741e25";

/** The accent color: the browser's color control, saved when the person is done choosing, and a way back to the app's own. */
export function ColorControl(props: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
  commit?: (value: string) => void;
  onReset?: () => void;
}) {
  const { t } = useWords();
  const shown = parseHex(props.value) ? props.value.toLowerCase() : APP_COLOR;
  // Passing the control by keyboard changes nothing: a color is saved only when the person chose one.
  const chosen = useRef(false);
  return (
    <div className="inline-field">
      <input
        id={props.id}
        type="color"
        value={shown}
        disabled={props.disabled}
        aria-describedby={props.describedBy}
        onChange={(e) => {
          chosen.current = true;
          props.onChange(e.target.value);
        }}
        onBlur={(e) => {
          if (!chosen.current) return;
          chosen.current = false;
          props.commit?.(e.target.value);
        }}
      />
      {props.value !== "" && props.onReset && (
        <Button variant="quiet" disabled={props.disabled} onClick={props.onReset}>
          {t("settings.brand.use_app_color")}
          <span className="sr"> {props.label}</span>
        </Button>
      )}
    </div>
  );
}

/** The logo: the picture now in use (or a line saying it is the initials), a file to upload, and a way back to the initials.
 * An upload is kept by the app and its name saved as the setting, with the usual note and Undo. */
export function LogoControl(props: {
  id: string;
  labelId: string;
  label: string;
  value: string;
  disabled: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
  commit?: (value: string) => void;
  onReset?: () => void;
}) {
  const { t } = useWords();
  const [problem, setProblem] = useState("");
  const [lost, setLost] = useState(false);
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setProblem("");
    setBusy(true);
    try {
      const kept = await api.uploadLogo(file);
      setLost(false);
      props.onChange(kept.name);
      props.commit?.(kept.name);
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="logo-control">
      {props.value !== "" && !lost ? (
        <img className="logo-preview" src={`api/brand/logo?v=${encodeURIComponent(props.value)}`} alt={t("settings.brand.logo_alt")} onError={() => setLost(true)} />
      ) : (
        <p className="hint">{t(props.value !== "" ? "settings.brand.logo_missing" : "settings.brand.logo_none")}</p>
      )}
      <FileDrop
        id={props.id}
        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
        disabled={props.disabled || busy}
        aria-labelledby={props.labelId}
        aria-describedby={props.describedBy}
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {busy && (
        <p className="hint" role="status">
          {t("settings.brand.logo_keeping")}
        </p>
      )}
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      {props.value !== "" && props.onReset && (
        <div>
          <Button variant="quiet" disabled={props.disabled} onClick={props.onReset}>
            {t("settings.brand.logo_remove")}
            <span className="sr"> {props.label}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
