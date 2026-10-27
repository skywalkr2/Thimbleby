// Raw data on screen (design 7.0): a title or a line never shows a data structure. This is the same rule the server applies
// to the text it writes (`api/screen_text.py`): a brace or bracket opening on a quote, a brace or a bracket, a flow mapping
// with a space after its colon, or a double-quoted key. A placeholder such as {name} or {n:02}, a quoted sentence and a
// heading that ends in a colon are not data.
const RAW_DATA = /[{[]\s*["'{[]|\{\s*[A-Za-z_][\w-]*\s*:\s+\S|"\w[\w .-]{0,40}"\s*:/;

/** Whether the text shows a raw data structure. */
export const holdsRawData = (text: string): boolean => RAW_DATA.test(text);

/** The prefixes of the app's own record ids (a project, a person, a to-do and the like): `PRJ-12`. */
const RECORD_ID = /\b(?:PRJ|PER|ORG|TEAM|ACT|SRC|REQ|CS|FACT|RULE|EVT|FILE|NOTE|LES|RUN|SER|LIST|ROUTE)-\d+\b/;
/** A raw mail header: a header's name and colon followed by an address in angle brackets or by the next header's name. */
const MAIL_HEADER =
  /\b(?:From|To|Cc|Bcc|Reply-To|Return-Path|Delivered-To):\s*(?:[^<\n]{0,60}<[^>\s]+@[^>\s]+>|\S+@\S+)|\b(?:Message-ID|Received|In-Reply-To|References|X-[A-Za-z-]+):\s*\S/;

/** Whether the text shows an internal id or a raw mail header: what no title, message or label of the screen carries
 * (check U13), whether it was written by the app or lifted from an input. */
export const leaksInternals = (text: string): boolean => RECORD_ID.test(text) || MAIL_HEADER.test(text);
