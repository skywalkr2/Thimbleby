import { render, screen } from "@testing-library/react";
import { WordingProvider, useWords } from "./wording";

function Said(props: { id: string }) {
  const { t } = useWords();
  return <p data-testid={props.id}>{t("schedule.view.work_week")}</p>;
}

test("a person with only their own life reads the variant of an entry, and everyone else the entry itself (X44)", () => {
  render(
    <>
      <WordingProvider justMe>
        <Said id="mine" />
      </WordingProvider>
      <WordingProvider>
        <Said id="shared" />
      </WordingProvider>
    </>,
  );
  expect(screen.getByTestId("mine")).toHaveTextContent("Weekdays");
  expect(screen.getByTestId("shared")).toHaveTextContent("Work week");
});

test("a workspace's own wording for an entry wins over the variant", () => {
  render(
    <WordingProvider justMe overrides={{ "schedule.view.work_week": "Mon to Fri" }}>
      <Said id="own" />
    </WordingProvider>,
  );
  expect(screen.getByTestId("own")).toHaveTextContent("Mon to Fri");
});
