// The Set aside folder (design 6.5): mail kept away from the assistant, in three sections, one row per message with its
// sender, date and why it was set aside. Leaving a message here is the confirmation. Treat as work or Treat as personal
// hands a message in after all; Always set aside mail like this teaches the sorting. The person's mailbox is never
// changed.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { whenText as when } from "../lib/dates";
import { useSetAside, type Section } from "../lib/set-aside";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import { RowMenu, type MenuAction } from "./RowMenu";

type Item = S["SetAsideView"];
const SECTIONS: Section[] = ["personal", "sales", "notices"];

export function SetAside() {
  const { t, tn } = useWords();
  const folder = useQuery({ queryKey: ["set-aside"], queryFn: api.setAside });
  const items = folder.data?.items ?? [];
  return (
    <section className="panel-section" aria-labelledby="set-aside-title" id="set-aside">
      <div className="heading">
        <h3 id="set-aside-title">{t("setaside.title")}</h3>
      </div>
      <p className="hint">{t("setaside.intro")}</p>
      {folder.isPending ? (
        <Skeleton />
      ) : folder.isError ? (
        <p className="empty">
          {t("setaside.load_failed")}{" "}
          <button type="button" className="btn" onClick={() => void folder.refetch()}>
            {t("action.try_again")}
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className="empty">{t("setaside.empty")}</p>
      ) : (
        SECTIONS.map((section) => (
          <SectionList key={section} section={section} items={items.filter((i) => i.section === section)} />
        ))
      )}
      {!!folder.data?.deleted && <p className="hint">{tn("setaside.deleted", folder.data.deleted)}</p>}
    </section>
  );
}

function SectionList(props: { section: Section; items: Item[] }) {
  const { t } = useWords();
  const { section, items } = props;
  const name = t(`setaside.section.${section}`);
  return (
    <section aria-labelledby={`set-aside-${section}`} data-section={section}>
      <div className="heading">
        <h4 id={`set-aside-${section}`}>
          {name} <span className="count">{items.length}</span>
        </h4>
      </div>
      {items.length === 0 ? (
        <p className="empty">{t("setaside.section_empty")}</p>
      ) : (
        <ul className="queue">
          {items.map((item) => (
            <SetAsideRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SetAsideRow(props: { item: Item }) {
  const { t } = useWords();
  const { isWork, isPersonal, alwaysLikeThis } = useSetAside();
  const [busy, setBusy] = useState(false);
  const { item } = props;
  const titleId = `set-aside-row-${item.id}`;
  const work = async () => {
    setBusy(true);
    await isWork({ id: item.id, title: item.title, version: item.version });
    setBusy(false);
  };
  const personal = async () => {
    setBusy(true);
    await isPersonal({ id: item.id, title: item.title, version: item.version });
    setBusy(false);
  };
  const menu: MenuAction[] = [
    { id: "personal", label: t("setaside.personal"), run: () => void personal() },
    ...(item.address
      ? [
          {
            id: "always",
            label: t("setaside.always_like_this"),
            run: () => void alwaysLikeThis({ id: item.id, title: item.title, section: item.section, address: item.address }),
          },
        ]
      : []),
    ...(item.link
      ? [{ id: "open", label: t("setaside.open"), run: () => void window.open(item.link ?? "", "_blank", "noopener,noreferrer") }]
      : []),
  ];
  const facts = [item.sender, item.received ? when(item.received) : "", item.source].filter(Boolean);
  return (
    <li className="line" data-row tabIndex={-1} aria-labelledby={titleId}>
      <div className="row">
        <div className="text">
          <strong id={titleId}>{item.title}</strong>
          <span className="sub">{facts.join(" · ")}</span>
          <span className="sub">{t("sources.closed.why", { reason: item.reason })}</span>
        </div>
        <div className="acts">
          <button
            type="button"
            className="btn primary"
            data-key="primary"
            disabled={busy}
            aria-label={t("setaside.work_named", { title: item.title })}
            onClick={() => void work()}
          >
            {t("setaside.work")}
          </button>
          <RowMenu label={item.title} actions={menu} />
        </div>
      </div>
    </li>
  );
}
