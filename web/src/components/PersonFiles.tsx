// The files from one person, on their page (design 7.14): a card beside the details with the newest few and "See all", and the
// page's Files tab with every one. A file belongs to a person when it records them as where it came from; a person with no such file has neither
// the card nor the tab, so nothing is drawn empty.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "../lib/api";
import { day } from "../lib/dates";
import { useSize } from "../lib/files";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Row } from "../ui/Row";
import { RowList } from "../ui/RowList";

/** The files recorded as coming from this person, newest first (the files list is already in that order). */
export function filesFromPerson(files: S["FileView"][] | undefined, person: string): S["FileView"][] {
  return (files ?? []).filter((f) => f.from_person === person);
}

export function usePersonFiles(person: string, enabled: boolean): S["FileView"][] {
  const files = useQuery({ queryKey: ["files"], queryFn: api.files, enabled });
  return filesFromPerson(files.data, person);
}

function FileLine(props: { file: S["FileView"] }) {
  const { t } = useWords();
  const size = useSize();
  const { file } = props;
  return (
    <Row
      title={
        <a href={api.fileContent(file.id)} target="_blank" rel="noopener noreferrer" aria-label={t("files.open_named", { name: file.name })}>
          {file.name}
        </a>
      }
      meta={[file.kind_label, size(file.size), t("files.added_on", { when: day(file.added_at) })].join(" · ")}
      oneLine
    />
  );
}

/** Every file from the person, as the Files tab lists them. */
export function PersonFilesList(props: { files: S["FileView"][] }) {
  return (
    <RowList>
      {props.files.map((file) => (
        <FileLine key={file.id} file={file} />
      ))}
    </RowList>
  );
}

/** The card in the rail: the newest few, with a way to the whole list. */
export function FilesFromCard(props: { name: string; files: S["FileView"][]; onSeeAll: () => void; limit?: number }) {
  const { t } = useWords();
  const shown = props.files.slice(0, props.limit ?? 3);
  return (
    <section className="record-side" data-slot="files" aria-labelledby="person-files-title">
      <div className="heading">
        <h3 id="person-files-title">
          {t("person.files.title", { name: props.name })}
        </h3>
        {props.files.length > shown.length && (
          <Button variant="quiet" size="sm" onClick={props.onSeeAll}>
            {t("person.files.see_all")}
          </Button>
        )}
      </div>
      <PersonFilesList files={shown} />
    </section>
  );
}
