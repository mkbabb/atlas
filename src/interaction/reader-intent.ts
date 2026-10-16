// interaction/reader-intent.ts — THE FOCUS-GATED CURSOR (U-F59a, U-F29 trigger; sci-report §H M-5).
//
// A keyboard control's cursor moves for two kinds of cause: a reader act (focus, an arrow key) and a
// program act (setup, the key list re-ordering or narrowing under a filter). Only the first is reader
// intent. A control that forwards every cursor change as `active-change` lets a program act enter
// the hover/selection channel as if a reader made it: the "phantom hover" that rang a ghost key at
// first paint on six plates and crashed /usf-integrity (a highlight dispatched into an ECharts lazy
// first frame).
//
// The gate is the one rule, stated once:
//   1. A key is raised only while the control holds focus.
//   2. A clear (`null`) is sent only for a key the control itself raised.
//   3. Losing focus (or unmounting) clears what the control raised, and nothing else.
//
// So a consumer binds `@active-change` straight to its store; it needs no "swallow the first emission"
// flag and no focus test of its own. PURE: no DOM, no Vue. `SelectionRegion` drives it from its focus,
// blur and cursor events; any other roving control can drive it the same way.

/** What the control emits for one event: `{ key }` to send, `null` to send nothing. */
export type IntentEmission = { readonly key: string | null } | null;

export interface ReaderIntentGate {
    /** The control gained focus with its cursor on `key`. */
    focus(key: string | null): IntentEmission;
    /** The cursor's key changed (an arrow key, or the key list changed under it). */
    move(key: string | null): IntentEmission;
    /** The control lost focus or is leaving the tree. */
    blur(): IntentEmission;
    /** Whether the control currently holds focus. */
    readonly focused: boolean;
    /** Whether a key the control raised is still live downstream. */
    readonly raised: boolean;
}

export function createReaderIntentGate(): ReaderIntentGate {
    let focused = false;
    let raised = false;

    function raise(key: string | null): IntentEmission {
        if (key !== null) {
            raised = true;
            return { key };
        }
        return clear();
    }
    function clear(): IntentEmission {
        if (!raised) return null;
        raised = false;
        return { key: null };
    }

    return {
        focus(key) {
            focused = true;
            return raise(key);
        },
        move(key) {
            return focused ? raise(key) : null;
        },
        blur() {
            focused = false;
            return clear();
        },
        get focused() {
            return focused;
        },
        get raised() {
            return raised;
        },
    };
}
