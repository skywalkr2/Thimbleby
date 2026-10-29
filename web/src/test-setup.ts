import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";
import { closeEveryEditor } from "./lib/one-editor";

// A loaded machine can take longer than the default second to render a screen's first data; waiting longer costs
// nothing when it renders sooner.
configure({ asyncUtilTimeout: 4000 });
window.scrollTo = () => undefined;

// What a screen keeps as a draft in the tab never carries from one test to the next.
beforeEach(() => window.sessionStorage.clear());

// And an editor one test left open is not open in the next.
beforeEach(() => closeEveryEditor());
