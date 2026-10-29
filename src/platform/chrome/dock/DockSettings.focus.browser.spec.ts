// The More sheet's focus on close (PLAN §2.5): like the other bar sheets, More returns focus to its
// gear when the reader closes it, and leaves focus alone when another surface took its seat. That
// surface moved focus into itself; a return to the gear pulled it back out. In WebKit the entity
// detail then read the move as focus leaving the dialog and closed (surface-seat "more is open,
// then detail arrives": the bottom seat fell to no holder).
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import DockSettings from "./DockSettings.vue";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(ok: () => boolean, ms: number): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (ok()) return true;
        await wait(20);
    }
    return ok();
}

let app: App | null = null;
afterEach(() => {
    app?.unmount();
    app = null;
    document.body.innerHTML = "";
});

function mount(returnFocus: boolean | undefined) {
    const open = ref(false);
    const elsewhere = document.createElement("button");
    elsewhere.textContent = "Elsewhere";
    document.body.appendChild(elsewhere);
    const probe = document.createElement("div");
    document.body.appendChild(probe);
    app = createApp(
        defineComponent({
            setup() {
                return () =>
                    h(DockSettings, {
                        open: open.value,
                        "onUpdate:open": (v: boolean) => (open.value = v),
                        hasYearScope: false,
                        yearModeNow: "single",
                        saveFlash: false,
                        disableTransitions: true,
                        ...(returnFocus === undefined ? {} : { returnFocus }),
                    });
            },
        }),
    );
    app.mount(probe);
    const gear = () => document.querySelector<HTMLElement>("[data-testid='dock-gear']")!;
    const sheetShown = () => document.querySelector(".usf-dock-settings") !== null;
    return { open, elsewhere, gear, sheetShown };
}

describe("DockSettings: focus when the sheet closes", () => {
    it("returns focus to the gear when the reader closes the sheet", async () => {
        const m = mount(undefined);
        await userEvent.click(m.gear());
        expect(await until(m.sheetShown, 1500), "the sheet opens").toBe(true);
        await userEvent.keyboard("{Escape}");
        expect(await until(() => !m.sheetShown(), 1500), "the sheet closes").toBe(true);
        expect(await until(() => document.activeElement === m.gear(), 1000), "focus is on the gear").toBe(true);
    });

    it("leaves focus where the displacing surface put it", async () => {
        const m = mount(false);
        await userEvent.click(m.gear());
        expect(await until(m.sheetShown, 1500), "the sheet opens").toBe(true);
        // Another surface takes the seat: it moves focus into itself, and the dock closes More.
        m.elsewhere.focus();
        m.open.value = false;
        await nextTick();
        expect(await until(() => !m.sheetShown(), 1500), "the sheet closes").toBe(true);
        await wait(300);
        expect(document.activeElement === m.gear(), "focus stays off the gear").toBe(false);
    });
});
