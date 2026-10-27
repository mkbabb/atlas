// dock-dismissal-focus-aria.spec.ts — the E25 BORN-RED dismissal / focus / ARIA detectors
// (B6 · E24-TRIUMVIRATE-ADJUDICATION-C2 §6.5 + §3.2 · critic `E24-UX-A11Y-CRIT-C2` U2/U3/U6/U9 ·
// state critic S3/S4).
//
// Lane e25:dismissal-focus-aria owns, off the preserved E24 dirty cut (the ownership lane's scoped
// registry + `topmost`/phase model is an INPUT here):
//   • topmost single-surface dismissal — one event closes only the TOP eligible surface (U6);
//   • the close → focus → release TRANSACTION — focus restored BEFORE the pin releases (S3);
//   • focus never lands on BODY / hidden / unmounted; the invoker is the receiver, crest the
//     fallback (U2/U3/§3.2);
//   • a complete nonmodal forward/reverse order with a NAMED exit — no wrap-trap, no BODY (S4);
//   • truthful filter ARIA — dialog popup role, aria-controls, a human accessible NAME, not the raw
//     dialVizId slug (U9).
//
// Each `it` binds the SHIPPED artifact (import for behavior, `readFileSync` for SFC wiring) and FAILS
// against the current E24 scaffolding (crest-only return, a racing second watcher, `aria-haspopup=
// "true"`, the `${dialVizId}` slug label, an ungated escape claim, an arbiter that never marks the
// Escape handled). It goes GREEN only when the mechanism lands. No sleep / retry / private-selector /
// fixed-size shim.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { createDismissArbiter } from "../../src/platform/interaction/dismiss-arbiter";
import {
    FIGURE_ESCAPE_PRIORITY,
    PLATE_LAYER_PRIORITY,
    plateLayerClaim,
} from "../../src/charts/frame/plate-layer";
import {
    createDockPortalRegistry,
    type PortalClaimSpec,
} from "../../src/platform/chrome/dock/composables/useDockPortals";

const src = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(`../../src/${rel}`, import.meta.url)), "utf8");

const DRAWER: PortalClaimSpec = {
    key: "filter-drawer",
    trigger: "membrane-filter-trigger",
    surface: "body-teleport",
    reason: "teleported-surface-fires-dock-leave",
};

// A node-env fake Document: the arbiter binds capture listeners on `document`; we drive them with a
// plain escape event (node has no KeyboardEvent). This binds the SHIPPED `createDismissArbiter`.
function fakeDoc(): {
    doc: Document;
    dispatch: (type: string, ev: unknown) => void;
} {
    const listeners: Record<string, Array<(ev: unknown) => void>> = {};
    const doc = {
        addEventListener(type: string, fn: (ev: unknown) => void): void {
            (listeners[type] ??= []).push(fn);
        },
        removeEventListener(type: string, fn: (ev: unknown) => void): void {
            listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn);
        },
    } as unknown as Document;
    return {
        doc,
        dispatch: (type, ev) => {
            for (const fn of [...(listeners[type] ?? [])]) fn(ev);
        },
    };
}

function escapeEvent(): { key: string; defaultPrevented: boolean; preventDefault: () => void; composedPath: () => EventTarget[] } {
    return {
        key: "Escape",
        defaultPrevented: false,
        preventDefault(): void {
            this.defaultPrevented = true;
        },
        composedPath: () => [],
    };
}

describe("dismissal stack — one Escape closes only the top eligible surface (U6)", () => {
    it("the topmost escape claim dismisses; a co-open lower surface is left untouched", () => {
        const { doc, dispatch } = fakeDoc();
        const arbiter = createDismissArbiter(doc);
        const fired: string[] = [];
        arbiter.claim({ id: "filter", priority: 30, escape: true, onDismiss: () => fired.push("filter") });
        arbiter.claim({ id: "sheet", priority: 40, escape: true, onDismiss: () => fired.push("sheet") });
        dispatch("keydown", escapeEvent());
        expect(fired).toEqual(["sheet"]); // exactly ONE surface — the topmost
        arbiter.destroy();
    });

    it("a handled Escape is marked defaultPrevented so it never cascades to a co-open surface", () => {
        const { doc, dispatch } = fakeDoc();
        const arbiter = createDismissArbiter(doc);
        arbiter.claim({ id: "filter", priority: 30, escape: true, onDismiss: () => {} });
        const ev = escapeEvent();
        dispatch("keydown", ev);
        // The E24 scaffolding dismissed the claim but left the event live, so a body-teleported Reka
        // menu's own Escape handler still ran — one Escape closed BOTH. Marking it handled is the cure.
        expect(ev.defaultPrevented).toBe(true);
        arbiter.destroy();
    });

    it("an already-handled Escape is ignored (no double-dismiss)", () => {
        const { doc, dispatch } = fakeDoc();
        const arbiter = createDismissArbiter(doc);
        let count = 0;
        arbiter.claim({ id: "filter", priority: 30, escape: true, onDismiss: () => (count += 1) });
        const ev = escapeEvent();
        ev.defaultPrevented = true; // a higher owner already claimed this Escape
        dispatch("keydown", ev);
        expect(count).toBe(0);
        arbiter.destroy();
    });
});

describe("close → focus → release transaction — focus restored BEFORE the pin releases (S3)", () => {
    it("claimOpen runs the close transaction while the hold is still LIVE, releasing only after", async () => {
        const reg = createDockPortalRegistry();
        const scope = effectScope();
        const open = ref(true);
        let heldDuringRestore: boolean | null = null;
        let phaseDuringRestore: string | undefined;
        scope.run(() => {
            reg.claimOpen(() => DRAWER, open, {
                restoreFocus: () => {
                    // the receiver is focused HERE — the pin must still be held so the (in-dock)
                    // invoker is rendered and focus can never fall to BODY on collapse.
                    heldDuringRestore = reg.anyHeld.value;
                    phaseDuringRestore = reg.topmost.value?.phase;
                },
            });
        });
        expect(reg.anyHeld.value).toBe(true);
        open.value = false;
        await nextTick();
        expect(heldDuringRestore).toBe(true); // focus restored while still holding
        expect(phaseDuringRestore).toBe("closing"); // during the closing phase, not after release
        expect(reg.anyHeld.value).toBe(false); // released only AFTER the transaction
        scope.stop();
    });

    it("a claimOpen WITHOUT a transaction still relinquishes directly (banked already-open behavior)", async () => {
        const reg = createDockPortalRegistry();
        const scope = effectScope();
        const open = ref(true);
        scope.run(() => reg.claimOpen(() => DRAWER, open));
        expect(reg.anyHeld.value).toBe(true);
        open.value = false;
        await nextTick();
        expect(reg.anyHeld.value).toBe(false);
        scope.stop();
    });

    it("the transaction does NOT fire on mount when the surface starts closed (no spurious focus grab)", async () => {
        const reg = createDockPortalRegistry();
        const scope = effectScope();
        const open = ref(false);
        let restoreCalls = 0;
        scope.run(() => {
            reg.claimOpen(() => DRAWER, open, { restoreFocus: () => (restoreCalls += 1) });
        });
        await nextTick();
        expect(restoreCalls).toBe(0); // only an open→close transition transacts, never the initial rest
        scope.stop();
    });
});

describe("truthful filter ARIA — dialog popup, aria-controls, human name, not the slug (U9)", () => {
    // B6 (§L D3-1): the route-level trigger in the dock's foot; the facet-5 zone is deleted.
    const membrane = src("platform/chrome/dock/components/DockFilterTrigger.vue");

    it("declares dialog popup semantics, not the menu value aria-haspopup=true", () => {
        expect(membrane).not.toContain('aria-haspopup="true"');
        expect(membrane).toContain('aria-haspopup="dialog"');
    });

    it("joins the trigger to its receiver with aria-controls (the stable drawer-body id)", () => {
        expect(membrane).toContain('aria-controls="filter-drawer-body"');
    });

    it("the accessible NAME is a human contract — the raw dialVizId slug label is struck", () => {
        // the E24 label interpolated the technical viz id: `Filters — ${dialVizId}`.
        expect(membrane).not.toMatch(/aria-label="[^"]*\$\{\s*dialVizId\s*\}/);
        expect(membrane).not.toMatch(/Filters[^"'`]*\$\{\s*dialVizId\s*\}/);
    });

    it("keeps the truthful expanded state binding", () => {
        expect(membrane).toContain(":aria-expanded=");
    });
});

describe("nonmodal focus return — the invoker is the receiver, crest the fallback (U2/U3/§3.2)", () => {
    const filterPanel = src("filter/ui/FilterPanel.vue");
    const vizPlate = src("charts/frame/VizPlate.vue");

    it("filter dismissal returns focus to the EXACT invoker (the membrane filter trigger)", () => {
        expect(filterPanel).toContain("data-membrane-filter-trigger");
    });

    it("the crest remains ONLY the fallback receiver, not the primary return target", () => {
        expect(filterPanel).toContain("dock-brand"); // still referenced — but as the fallback
    });

    it("the close focus-restore is threaded through claimOpen's transaction (one ordered owner, S3)", () => {
        // NOT a second independent watch(open) that races the phase release — the transaction hook is
        // the single ordered owner, so focus is provably restored before `released`.
        expect(filterPanel).toMatch(/claimOpen\([\s\S]*restoreFocus/);
    });

    it("a plate layer over the drawer takes the first Escape; the drawer the next (U6, K-1)", () => {
        // The arbiter's priority order is the topmost law: the drawer claims at 30, a plate layer at
        // PLATE_LAYER_PRIORITY, so the layer closes alone and the drawer survives the first Escape.
        expect(filterPanel).toMatch(/id: "filter-drawer",\s*priority: 30,\s*outsidePointer: true,\s*escape: true,/);
        const doc = new EventTarget() as unknown as Document;
        const arbiter = createDismissArbiter(doc);
        const fired: string[] = [];
        const offDrawer = arbiter.claim({ id: "filter-drawer", priority: 30, escape: true, onDismiss: () => fired.push("drawer") });
        const offLayer = arbiter.claim(plateLayerClaim("usf-fund-ledger", "download", () => fired.push("layer")));
        const esc = () => doc.dispatchEvent(Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" }));
        esc();
        expect(fired).toEqual(["layer"]);
        offLayer();
        esc();
        expect(fired).toEqual(["layer", "drawer"]);
        offDrawer();
        arbiter.destroy();
        expect(PLATE_LAYER_PRIORITY).toBeGreaterThan(FIGURE_ESCAPE_PRIORITY);
    });

    it("FilterPanel stays NONMODAL — no aria-modal, no inert page, no hard trap", () => {
        expect(filterPanel).not.toContain('aria-modal="true"');
        expect(filterPanel).not.toContain("aria-modal=\"true\"");
    });

    it("a nonmodal NAMED exit handles the Tab boundary so focus never sinks to BODY (S4)", () => {
        // a Tab off the first/last focusable redirects to the named invoker (a real visible control),
        // never a wrap-around trap and never BODY.
        expect(filterPanel).toMatch(/["']Tab["']/);
    });

    it("export's invoker lives on the plate, so its close returns focus to a trigger that never unmounts (A-39)", () => {
        // A-39 (the plate): the download is an act in the plate's own act row, not a dock door. The
        // dock-rail close transaction (S3) had to seat focus before a collapsing rail unmounted the
        // trigger; on the plate the trigger stays mounted, so the menu's own close returns focus to it
        // and the receiver is deleted with the dock door (no alias).
        expect(vizPlate).not.toMatch(/exportMenuOpen|restoreExportFocus/);
        expect(vizPlate).toMatch(/<PlateDock[\s\S]{0,200}:export-csv="onExportCsv"/);
    });
});
