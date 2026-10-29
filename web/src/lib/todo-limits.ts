// The longest a to-do's words may be, so a field can count against it and say so beside itself instead of the server refusing
// a long one afterwards. It is the server's limit for a typed to-do (`TodoAddIn.text`); a test keeps the two equal.
export const TODO_TEXT_MAX = 300;
