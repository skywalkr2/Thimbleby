import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useSettingWords } from "./setting-words";
import { WordingProvider } from "./wording";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const wrap = ({ children }: { children: ReactNode }) => (
  <WordingProvider>
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  </WordingProvider>
);

test("a picture is told as the picture, never by the file name the app keeps it under", () => {
  const { result } = renderHook(() => useSettingWords((id) => id), { wrapper: wrap });
  const logo = { key: "ui.brand.logo", type: "text" as const, widget: "image" as const };
  expect(result.current.value(logo as never, "logo-843c1f97d8c5.png")).toBe("the picture you chose");
  expect(result.current.value(logo as never, "")).toBe("your initials");
});
