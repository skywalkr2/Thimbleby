// Handing something in (design 7.6): one box, and a required choice of whose words are in it. "Someone else's" (the
// default) sends the box as pasted content (untrusted: material, never instructions) with an optional line saying what
// to do with it, which is the PM's own note (trusted). "Mine" sends the box as the PM's note. Either way the assistant
// always knows which words are the PM's. It opens as a drawer from the right (a full-screen sheet on a phone), so the screen
// it was opened from stays in view; closing it with words in the box asks first.
import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { PlaceOptions } from "./PlaceOptions";
import { useSides } from "../lib/sides";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Select } from "../ui/Select";
import { FormField } from "../ui/FormField";
import { FormBlock } from "../ui/FormBlock";
import { useHandedToast, useWaitsForStart } from "../lib/handed-toast";

const OwnContext = createContext<{ ids: Set<string>; add: (id: string) => void }>({
  ids: new Set(),
  add: () => undefined,
});

/** Requests the PM handed in from this screen: they show at once instead of waiting behind "N new". */
export function OwnRequestsProvider(props: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const add = useCallback((id: string) => setIds((prev) => new Set([...prev, id])), []);
  return <OwnContext.Provider value={{ ids, add }}>{props.children}</OwnContext.Provider>;
}

export function useOwnRequests(): Set<string> {
  return useContext(OwnContext).ids;
}

/** Mark a request the PM just handed in from anywhere on the screen, so it shows at once. */
export function useAddOwnRequest(): (id: string) => void {
  return useContext(OwnContext).add;
}

/** A voice note: a sound file, kept and turned into text by an account that takes speech once it runs. */
const SOUND_FILE = /^audio\/|\.(m4a|mp3|wav|ogg|oga|opus|webm|flac|aac)$/i;

type Whose = "others" | "mine";
/** How sensitive the person says it is: the usual sends nothing, so the workspace's own rules decide. */
type Sensitivity = "" | "internal" | "restricted";
type FileRow = { id: number; name: string; status: "read" | "kept" | "refused" | "voice"; reason?: string; picture?: boolean };

export function HandIn(props: { onClose: () => void }) {
  const { t } = useWords();
  const act = useAct();
  const own = useContext(OwnContext);
  const [text, setText] = useState("");
  const [whose, setWhose] = useState<Whose>("others");
  const [todo, setTodo] = useState("");
  const [sensitivity, setSensitivity] = useState<Sensitivity>("");
  const [project, setProject] = useState("");
  const { justMe } = useSides();
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const [dropProblem, setDropProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [fileRows, setFileRows] = useState<FileRow[]>([]);
  const waitsForStart = useWaitsForStart();
  const toast = useHandedToast();
  const first = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nextFileRow = useRef(0);
  useEffect(() => first.current?.focus(), []);

  const addFileRow = (row: Omit<FileRow, "id">) => {
    const id = ++nextFileRow.current;
    setFileRows((previous) => [...previous, { id, ...row }]);
  };

  const processFiles = async (files: File[]) => {
    setDropProblem("");
    const sounds = files.filter((f) => SOUND_FILE.test(f.type) || SOUND_FILE.test(f.name));
    const documents = files.filter((f) => !sounds.includes(f));
    setFileBusy(true);
    for (const file of documents) {
      let refusal: ApiError | undefined;
      const result = await act(async () => {
        try {
          return await api.handInFile(file, {
            note: whose === "others" ? todo : undefined,
            project: project || undefined,
            data_level: sensitivity || undefined,
          });
        } catch (error) {
          if (error instanceof ApiError) refusal = error;
          throw error;
        }
      });
      if (result) {
        if (result.request) own.add(result.request);
        addFileRow({
          name: result.name,
          status: result.status,
          picture: file.type.startsWith("image/") && result.status === "kept",
        });
      } else if (refusal) {
        addFileRow({ name: file.name, status: "refused", reason: refusal.detail });
      }
    }
    for (const sound of sounds) {
      let refusal: ApiError | undefined;
      const handed = await act(
        async () => {
          try {
            return await api.handInAudio(sound, project || undefined);
          } catch (error) {
            if (error instanceof ApiError) refusal = error;
            throw error;
          }
        },
        () => ({ message: t("toast.voice_handed_in", { name: sound.name }) }),
      );
      if (handed) {
        own.add(handed.request);
        addFileRow({ name: sound.name, status: "voice" });
      } else if (refusal) {
        addFileRow({ name: sound.name, status: "refused", reason: refusal.detail });
      }
    }
    setFileBusy(false);
  };

  const submit = async () => {
    setBusy(true);
    // Someone else's words are always material (pasted); only the PM's own words are ever sent as the note.
    const words = whose === "mine" ? { note: text, pasted: "" } : { note: todo, pasted: text };
    const body: S["HandIn"] = { ...words };
    if (sensitivity) body.data_level = sensitivity;
    if (project) body.project = project;
    let waits = false;
    const handed = await act(
      async () => {
        const made = await api.handIn(body);
        waits = await waitsForStart();
        return made;
      },
      () => toast(waits, t("toast.handed_in"), t("toast.handed_in_waiting")),
    );
    setBusy(false);
    if (handed) {
      own.add(handed.request);
      props.onClose();
    }
  };

  // A picture on the clipboard can't be read (the assistant reads words): say so, and keep what is in the box. A paste that
  // carries its words as well is an ordinary paste of text.
  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const data = event.clipboardData;
    const files = Array.from(data?.files ?? []);
    if (files.length === 0 || data.getData("text")) return;
    event.preventDefault();
    if (files.some((file) => file.type.startsWith("image/"))) {
      setDropProblem(t("handin.picture_not_read"));
      return;
    }
    void processFiles(files);
  };

  const onDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.dataTransfer.files);
    if (!files.length) return;
    event.preventDefault();
    await processFiles(files);
  };

  return (
    <Drawer
      open
      wide
      title={t("handin.title")}
      onClose={props.onClose}
      dirty={text.trim() !== "" || todo.trim() !== ""}
      footer={
        <>
          <Button variant="quiet" onClick={props.onClose}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" type="submit" form="handin-form" disabled={busy || !text.trim()}>
            {t("handin.go")}
          </Button>
        </>
      }
    >
      <form
        id="handin-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <FormField id="handin-box" label={t("handin.box")}>
          <textarea
            id="handin-box"
            className="drop big"
            ref={first}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setDropProblem("");
            }}
            onPaste={onPaste}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => void onDrop(e)}
            placeholder={t("handin.box_placeholder")}
          />
          {dropProblem && (
            <p className="hint" role="status">
              {dropProblem}
            </p>
          )}
        </FormField>
        <Button type="button" variant="quiet" disabled={fileBusy} onClick={() => fileInput.current?.click()}>
          {t("handin.file.choose")}
        </Button>
        <input
          ref={fileInput}
          hidden
          type="file"
          multiple
          aria-label={t("handin.file.choose")}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void processFiles(files);
          }}
        />
        {fileRows.length > 0 && (
          <ul aria-label={t("handin.file.list")}>
            {fileRows.map((row) => (
              <li key={row.id}>
                <span>{row.name}</span>
                <span>
                  {row.status === "read"
                    ? t("handin.file.read")
                    : row.status === "kept"
                      ? t("handin.file.kept")
                      : row.status === "voice"
                        ? t("handin.file.voice")
                        : t("handin.file.refused", { reason: row.reason ?? "" })}
                </span>
                {row.picture && <span>{t("handin.picture_not_read")}</span>}
              </li>
            ))}
          </ul>
        )}
        <FormBlock className="choice">
          <span aria-hidden="true">{t("handin.whose")}</span>
          <SegmentedControl
            label={t("handin.whose")}
            options={[
              { value: "others", label: t("handin.whose.others") },
              { value: "mine", label: t("handin.whose.mine") },
            ]}
            value={whose}
            onChange={setWhose}
          />
          <p className="hint">{t(whose === "mine" ? "handin.whose_hint.mine" : "handin.whose_hint.others")}</p>
        </FormBlock>
        {whose === "others" && (
          <FormField id="handin-todo" label={t("handin.todo")}>
            <input
              id="handin-todo"
              type="text"
              value={todo}
              onChange={(e) => setTodo(e.target.value)}
              placeholder={t("handin.todo_placeholder")}
            />
          </FormField>
        )}
        <FormField id="handin-sensitivity" label={t("handin.sensitivity")}>
          <Select
            id="handin-sensitivity"
            value={sensitivity}
            aria-describedby="handin-sensitivity-hint"
            onChange={(e) => setSensitivity(e.target.value as Sensitivity)}
          >
            <option value="">{t("handin.sensitivity.usual")}</option>
            <option value="internal">{t("handin.sensitivity.internal")}</option>
            <option value="restricted">{t("handin.sensitivity.restricted")}</option>
          </Select>
          <span id="handin-sensitivity-hint" className="hint">
            {t("handin.sensitivity_hint")}
          </span>
        </FormField>
        {!justMe && (
        <FormField id="handin-project" label={t("handin.project")}>
          <Select
            id="handin-project"
            value={project}
            aria-describedby="handin-project-hint"
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">{t("handin.project.none")}</option>
            <PlaceOptions projects={projects.data ?? []} />
          </Select>
          <span id="handin-project-hint" className="hint">
            {t("handin.project_hint")}
          </span>
        </FormField>
        )}
      </form>
    </Drawer>
  );
}
