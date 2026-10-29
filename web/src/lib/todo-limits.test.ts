import schema from "../api/openapi.json";
import { TODO_TEXT_MAX } from "./todo-limits";

// The field counts against the server's own limit, so a long to-do is said to be long before it is sent.
test("the limit the field counts against is the server's limit for a typed to-do", () => {
  const body = (schema as { components: { schemas: Record<string, { properties: Record<string, { maxLength?: number }> }> } }).components.schemas.TodoAddIn;
  expect(body.properties.text.maxLength).toBe(TODO_TEXT_MAX);
});
