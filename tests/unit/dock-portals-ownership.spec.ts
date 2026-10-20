// dock-portals-ownership.spec.ts — the E25 BORN-RED ownership/identity/cleanup/census detectors
// (B6 · E24-STATE-INTEGRITY-CRIT-C2 S1/S2/S6 · board §6.2-6.4/§3.1).
//
// Each `it` binds the SHIPPED `useDockPortals` artifact (import) — NOT a re-declared local model — and
// FAILS against the module-global `Set<string>` scaffolding (no `createDockPortalRegistry`, no owner
// identity, no census). It goes GREEN only when the dock/app-scoped claim-handle model + typed
// outside-interaction census land. No sleep / retry / private-selector / fixed-size shim.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";
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
// Two further claim families for the registry mechanics. Since A-39 (the plate) only the filter
// drawer holds the dock in the shipped tree; the registry stays generic over families.
const EXPORT_A: PortalClaimSpec = {
    key: "surface-a",
    trigger: "dock-trigger-a",
    surface: "body-teleport",
    reason: "teleported-surface-fires-dock-leave",
};
const SOURCE_A: PortalClaimSpec = {
    key: "surface-b",
    trigger: "dock-trigger-b",
    surface: "body-teleport",
    reason: "teleported-surface-fires-dock-leave",
};

describe("dock-portal ownership — claim-handle identity, not a Set<string> (S1)", () => {
    it("duplicate same-key owners: releasing owner A never clears owner B's live hold", () => {
        const reg = createDockPortalRegistry();
        const a = reg.claim(DRAWER);
        const b = reg.claim(DRAWER);
        a.setPhase("open");
        b.setPhase("open");
        expect(a.owner).not.toBe(b.owner); // two OWNERS, not one lossy key membership
        expect(reg.anyHeld.value).toBe(true);
        // A closes/disposes; B's still-live claim on the SAME key must survive.
        a.release();
        expect(reg.anyHeld.value).toBe(true);
        expect(reg.heldKeys.value).toContain("filter-drawer");
        b.release();
        expect(reg.anyHeld.value).toBe(false);
        expect(reg.heldKeys.value).toHaveLength(0);
    });

    it("compare-and-clear: release evicts ONLY the calling owner and is idempotent", () => {
        const reg = createDockPortalRegistry();
        const a = reg.claim(EXPORT_A);
        const b = reg.claim(SOURCE_A);
        a.setPhase("open");
        b.setPhase("open");
        a.release();
        a.release(); // idempotent — a second release must not evict b
        expect(reg.census.value.map((e) => e.key)).toEqual(["surface-b"]);
        expect(reg.anyHeld.value).toBe(true);
        b.release();
        expect(reg.census.value).toHaveLength(0);
    });
});

describe("dock-portal isolation — a per-scope registry, not a process singleton (S1)", () => {
    it("two app/dock roots do not share one registry", () => {
        const r1 = createDockPortalRegistry();
        const r2 = createDockPortalRegistry();
        const a = r1.claim(DRAWER);
        a.setPhase("open");
        expect(r1.anyHeld.value).toBe(true);
        expect(r2.anyHeld.value).toBe(false); // an old singleton would leak A into r2
        a.release();
        expect(r1.anyHeld.value).toBe(false);
    });
});

describe("dock-portal lifecycle phases — held until released, topmost is a stack (§6.3)", () => {
    it("a hold survives closing/focus-restored and drops only at released", () => {
        const reg = createDockPortalRegistry();
        const a = reg.claim(DRAWER);
        for (const phase of ["opening", "open", "closing", "focus-restored"] as const) {
            a.setPhase(phase);
            expect(reg.anyHeld.value).toBe(true); // the pin holds through the whole close transaction
            expect(reg.census.value[0]?.phase).toBe(phase);
        }
        a.setPhase("released");
        expect(reg.anyHeld.value).toBe(false); // released relinquishes the pin — the ONLY phase that does
    });

    it("topmost is the most-recently-opened held surface (a stack, not a boolean aggregate)", () => {
        const reg = createDockPortalRegistry();
        const a = reg.claim(DRAWER);
        const b = reg.claim(EXPORT_A);
        a.setPhase("open");
        b.setPhase("open");
        expect(reg.topmost.value?.key).toBe("surface-a"); // last opened wins
        b.setPhase("released");
        expect(reg.topmost.value?.key).toBe("filter-drawer"); // dismiss the top → the next is topmost
    });
});

describe("dock-portal reactive identity — evict A, register B; no dial-back resurrection (S6)", () => {
    it("A-to-B same-host key replacement follows B and evicts A", async () => {
        const reg = createDockPortalRegistry();
        const scope = effectScope();
        const contractId = ref("a");
        const open = ref(true);
        scope.run(() => {
            reg.claimOpen(
                () => ({ ...EXPORT_A, key: `surface-${contractId.value}` }),
                open,
            );
        });
        expect(reg.heldKeys.value).toEqual(["surface-a"]);
        const ownerA = reg.census.value[0]?.owner;
        contractId.value = "b"; // the one instance is re-keyed A→B without remount
        await nextTick();
        expect(reg.heldKeys.value).toEqual(["surface-b"]); // identity followed B
        const ownerB = reg.census.value[0]?.owner;
        expect(ownerB).not.toBe(ownerA); // A was evicted, B is a fresh owner — no carried identity
        scope.stop();
    });

    it("dial-away drops the hold; dial-back re-claims a FRESH owner (no stale resurrection)", async () => {
        const reg = createDockPortalRegistry();
        const scope = effectScope();
        const onDial = ref(true); // teleportPlateChrome
        const open = ref(true); // exportMenuOpen
        scope.run(() => {
            reg.claimOpen(
                () => (onDial.value ? EXPORT_A : null),
                open,
            );
        });
        expect(reg.anyHeld.value).toBe(true);
        const first = reg.census.value[0]?.owner;
        onDial.value = false; // dial AWAY — the plate leaves the facet-6 detent
        await nextTick();
        expect(reg.anyHeld.value).toBe(false);
        expect(reg.census.value).toHaveLength(0); // the hold is gone, not merely hidden
        onDial.value = true; // dial BACK
        await nextTick();
        expect(reg.anyHeld.value).toBe(true);
        expect(reg.census.value[0]?.owner).not.toBe(first); // a NEW claim, never a resurrected one
        scope.stop();
    });
});

describe("dock-portal deterministic teardown — scope dispose evicts every claim (HMR/unmount)", () => {
    it("stopping the owning effect scope releases the claim with zero residue", () => {
        const reg = createDockPortalRegistry();
        const scope = effectScope();
        const open = ref(true);
        scope.run(() => reg.claimOpen(() => DRAWER, open));
        expect(reg.anyHeld.value).toBe(true);
        scope.stop(); // component unmount / HMR module replacement
        expect(reg.anyHeld.value).toBe(false);
        expect(reg.census.value).toHaveLength(0);
    });
});

describe("dock-portal outside-interaction census — truthful surface destinations (S2/§3.1)", () => {
    it("the census records each held family's surface and the reason it holds the dock", () => {
        const reg = createDockPortalRegistry();
        const drawer = reg.claim(DRAWER);
        drawer.setPhase("open");
        expect(reg.census.value.map((e) => [e.key, e.surface, e.reason])).toEqual([
            ["filter-drawer", "body-teleport", "teleported-surface-fires-dock-leave"],
        ]);
    });

    it("the dead census members and their stale comments are deleted (U RULINGS §K K-4)", () => {
        // A-39 moved the export menu and the inline source aside out of the dock, so no claim can
        // carry `inline-aside` or `door-in-dock-surface-outside` (clean break: no alias).
        const portals = src("platform/chrome/dock/composables/useDockPortals.ts");
        expect(portals).not.toMatch(/"inline-aside"|"door-in-dock-surface-outside"/);
        expect(portals).toMatch(/export type PortalSurface = "body-teleport";/);
        expect(portals).toMatch(/export type PortalHoldReason = "teleported-surface-fires-dock-leave";/);
        // The comments that still described a dock-held export menu or a re-homed CSV/image export.
        expect(portals).not.toMatch(/the export MENU/);
        expect(src("platform/chrome/dock/composables/useDockCollapse.ts")).not.toMatch(/the export menu/);
        expect(src("platform/chrome/dock/Dock.vue")).not.toMatch(/the export MENU/);
        expect(src("platform/provenance/index.ts")).not.toMatch(/provenance \+ CSV\/image export into the dock/);
    });

    it("VizPlate claims NO dock hold: its export and source acts live on the plate (A-39)", () => {
        const vizPlate = src("charts/frame/VizPlate.vue");
        // A-39 (the plate): the facet-6 export teleport and its two dock holds are deleted with no
        // alias. A plate's download is an act in its own act row, so it never holds the dock open.
        expect(vizPlate).not.toContain("useDockPortals");
        expect(vizPlate).not.toContain("claimOpen");
        expect(vizPlate).not.toContain("useMembraneProvenanceSource");
    });

    it("ChapterStage adds NO dock hold from DOM syntax alone (§3.1 — no auto inline-family claim)", () => {
        const chapterStage = src("charts/scene/ChapterStage.vue");
        // the board strikes the "ChapterStage missing portal" defect: an inline-family hold is admitted
        // only behind a MOUNTED born-RED reason (an acceptance lane), never auto-added here.
        expect(chapterStage).not.toContain("useDockPortals");
        expect(chapterStage).not.toContain("claimPortal");
    });

});
