// The engine's keyboard-navigation key for a Tab walk. WebKit, like Safari at its default setting,
// moves Tab between text fields only; Option+Tab reaches buttons and links (the B6 tabWalk note).
import { server } from "vitest/browser";

export const walkKey = server.browser === "webkit" ? "{Alt>}{Tab}{/Alt}" : "{Tab}";
