// useDockPortals — THE DOCK OUTSIDE-INTERACTION OWNERSHIP REGISTRY (W-MEMBRANE ·
// E24-STATE-INTEGRITY-CRIT-C2 S1/S2/S6 · the E24-TRIUMVIRATE-ADJUDICATION-C2 §6.3 bounded redress).
//
// ── WHY A HOLD EXISTS ─────────────────────────────────────────────────────────────────────────────
// A dock-spawned surface (the filter DRAWER, the export MENU) opens from a control that lives INSIDE
// the dock, but its interactive surface lands OUTSIDE the dock `$el` — either body-teleported (Reka
// DialogPortal / DropdownMenu → <body>) or an inline `<aside>` in the host whose trigger DOOR is the
// only thing relocated into the dock. Either way a pointer/focus move into that outside region fires
// the dock's own `pointerleave` / `focusout`; under the transient hover-bloom the rail re-collapses
// mid-interaction, the trigger vanishes (stale aria-expanded), and focus drops. While such a surface
// HOLDS the dock, the dock yields collapse-authority to it (the `portal:false` intent above the bloom)
// and does not auto-collapse until the hold is RELEASED.
//
// ── WHAT THIS REPLACES (the state-integrity critic S1/S2/S6) ──────────────────────────────────────
// The prior model was a module-global `Set<string>`: process-wide (two app roots / HMR scopes / test
// mounts shared one registry, S1), key-membership only (one owner clearing another owner's same-key
// hold, S1), a boolean aggregate with no topmost stack, no lifecycle phases, and a label-driven notion
// of "portal" that mis-named an inline aside a body-teleport (S2). This file replaces it with:
//   • a per-scope registry (`createDockPortalRegistry`, provided at the app/dock root) — ISOLATED by
//     construction, never a process singleton;
//   • CLAIM HANDLES with owner identity + compare-and-clear release (releasing owner A can never evict
//     owner B's live same-key claim — S1);
//   • explicit lifecycle PHASES opening → open → closing → focus-restored → released; the hold survives
//     the whole close/focus transaction and relinquishes ONLY at `released` (S3's transaction is a
//     separate lane, but the phase model it drives lives here);
//   • REACTIVE identity: `claimOpen` binds a reactive spec so an A→B re-key or a dial-away/back evicts
//     the stale owner and mints a fresh one — no resurrected hold (S6);
//   • TOPMOST ownership: a recency stack (`topmost`), not a boolean aggregate; and
//   • a TYPED outside-interaction CENSUS recording each hold's actual surface destination, trigger,
//     owner, phase, and the concrete reason the hold is required (S2/§3.1) — the truthful replacement
//     for label/Teleport-syntax-driven portal naming.

import {
    computed,
    inject,
    onScopeDispose,
    provide,
    ref,
    toValue,
    watch,
    type ComputedRef,
    type InjectionKey,
    type MaybeRefOrGetter,
} from "vue";

/** The dock-hold lifecycle. The pin holds through the whole close/focus transaction and is
    relinquished ONLY at `released` — the one phase for which the dock resumes collapse-authority. */
export type PortalPhase =
    | "opening"
    | "open"
    | "closing"
    | "focus-restored"
    | "released";

/** Where the interactive surface ACTUALLY lands (not where its door/trigger lives) — the §3.1 truth
    the old label-driven census got wrong. `body-teleport`: a Reka DialogPortal / DropdownMenu mounted
    to <body>, wholly outside the dock. `inline-aside`: an in-place `<aside>` in the host; only its
    DOOR is relocated into the dock detent. */
export type PortalSurface = "body-teleport" | "inline-aside";

/** The concrete contract a lost dock hold would violate — the census's "why a hold is required". */
export type PortalHoldReason =
    // the surface is body-teleported outside the rail, so moving into it fires the dock's own
    // pointerleave/focusout and re-collapses the rail mid-interaction.
    | "teleported-surface-fires-dock-leave"
    // the surface is inline in the host but its TRIGGER door lives in the dock detent; collapsing the
    // rail strands that door (stale aria-expanded, unreachable toggle) while the surface stays open.
    | "door-in-dock-surface-outside";

/** A claim's descriptor. `key` identifies the outside-interaction FAMILY (filter-drawer,
    export-menu-<id>, source-data-<id>); the rest is the typed census payload. */
export interface PortalClaimSpec {
    key: string;
    trigger: string;
    surface: PortalSurface;
    reason: PortalHoldReason;
}

/** One row of the dock-owned outside-interaction census — an immutable projection of a live claim. */
export interface PortalCensusEntry {
    readonly owner: symbol;
    readonly key: string;
    readonly trigger: string;
    readonly surface: PortalSurface;
    readonly reason: PortalHoldReason;
    readonly phase: PortalPhase;
    /** The recency-stack rank; a higher `order` is nearer the top (last activated). */
    readonly order: number;
}

/** The close → focus → release transaction (S3 · §3.2). `restoreFocus` seats focus on the receiver
    (the exact invoker while it is rendered + actionable, else the owner-ratified persistent crest)
    WHILE the pin is still held (phase `closing`); the pin relinquishes ONLY afterwards
    (`focus-restored` → `released`). So a collapsing dock can never strand focus at BODY, and the
    receiver's own focusin-bloom takes over the rail before the pin lets go. Absent ⇒ the banked
    already-open behavior — a false edge relinquishes directly. */
export interface PortalCloseTransaction {
    restoreFocus?: () => void;
}

/** A live claim handle. Owner identity (`owner`) is unique per claim — release compares against it, so
    one owner can never clear another's same-key hold. */
export interface PortalClaimHandle {
    readonly owner: symbol;
    readonly key: string;
    /** Advance this claim's lifecycle phase. `open`/`opening` re-stack it topmost; `released`
        relinquishes the pin (the record stays registered until `release()` or scope dispose). */
    setPhase: (phase: PortalPhase) => void;
    /** Terminal compare-and-clear: evict ONLY this owner's record. Idempotent. */
    release: () => void;
}

/** The dock/app-scoped registry surface. Every field is reactive; a component reaches its scope's
    instance through `useDockPortals()`. */
export interface DockPortalRegistry {
    /** True while ≥1 claim is held (phase !== `released`) — the dock reads this to pin itself open. */
    anyHeld: ComputedRef<boolean>;
    /** The distinct held keys — diagnosable BY NAME, never an opaque count. */
    heldKeys: ComputedRef<readonly string[]>;
    /** The typed outside-interaction census, ordered by the recency stack. */
    census: ComputedRef<readonly PortalCensusEntry[]>;
    /** The topmost held surface (last activated) — the seam a dismissal stack closes first. Null when
        nothing is held. */
    topmost: ComputedRef<PortalCensusEntry | null>;
    /** Register a claim imperatively; the caller drives its phases and calls `release()` on teardown. */
    claim: (spec: PortalClaimSpec) => PortalClaimHandle;
    /** Bind a reactive spec + open-state into one claim: a null spec (or a changed `key`) evicts the
        stale owner and, when non-null, mints a fresh one (reactive identity, S6); `open` drives the
        `open`/`released` phase; the claim auto-releases on scope dispose (deterministic teardown). An
        optional `transaction.restoreFocus` seats the close → focus → release ordering (S3): the pin
        holds through `closing`, focus is restored, and only THEN does it relinquish. */
    claimOpen: (
        spec: MaybeRefOrGetter<PortalClaimSpec | null>,
        open: MaybeRefOrGetter<boolean>,
        transaction?: PortalCloseTransaction,
    ) => void;
}

interface ClaimRecord {
    owner: symbol;
    key: string;
    trigger: string;
    surface: PortalSurface;
    reason: PortalHoldReason;
    phase: PortalPhase;
    order: number;
}

const HOLDING: (phase: PortalPhase) => boolean = (phase) => phase !== "released";

/**
 * Mint one dock/app-scoped portal registry. Instance state (NOT a module singleton), so two app roots,
 * overlapping router trees, test mounts, and HMR replacement scopes each own a private registry — the
 * cross-scope leak the old `Set<string>` could not prevent (S1).
 */
export function createDockPortalRegistry(): DockPortalRegistry {
    const records = ref<ClaimRecord[]>([]);
    let seq = 0;

    const held = computed(() => records.value.filter((r) => HOLDING(r.phase)));
    const anyHeld = computed(() => held.value.length > 0);
    const heldKeys = computed<readonly string[]>(() => [
        ...new Set(held.value.map((r) => r.key)),
    ]);
    const census = computed<readonly PortalCensusEntry[]>(() =>
        [...records.value]
            .sort((a, b) => a.order - b.order)
            .map((r) => ({ ...r })),
    );
    const topmost = computed<PortalCensusEntry | null>(() => {
        const stack = held.value;
        if (stack.length === 0) return null;
        const top = stack.reduce((a, b) => (b.order > a.order ? b : a));
        return { ...top };
    });

    /** Rebuild the reactive array with `next` applied to the record owning `owner` (or dropped when
        `next` is null). One reassignment per mutation keeps every computed reactive. */
    const rewrite = (owner: symbol, next: ClaimRecord | null): void => {
        records.value = records.value.flatMap((r) =>
            r.owner === owner ? (next ? [next] : []) : [r],
        );
    };

    const claim = (spec: PortalClaimSpec): PortalClaimHandle => {
        const owner = Symbol(spec.key);
        const record: ClaimRecord = {
            owner,
            key: spec.key,
            trigger: spec.trigger,
            surface: spec.surface,
            reason: spec.reason,
            phase: "opening",
            order: seq++,
        };
        records.value = [...records.value, record];
        let live = true;

        const setPhase = (phase: PortalPhase): void => {
            if (!live) return;
            const current = records.value.find((r) => r.owner === owner);
            if (!current || current.phase === phase) return;
            // opening/open re-stacks this surface topmost — a recency stack, not claim order.
            const order = phase === "open" || phase === "opening" ? seq++ : current.order;
            rewrite(owner, { ...current, phase, order });
        };
        const release = (): void => {
            if (!live) return; // idempotent — a second release cannot evict a re-used key's new owner
            live = false;
            rewrite(owner, null);
        };
        return { owner, key: spec.key, setPhase, release };
    };

    const claimOpen: DockPortalRegistry["claimOpen"] = (specSource, open, transaction) => {
        let handle: PortalClaimHandle | null = null;

        // Identity: claim/evict as the reactive spec's KEY changes (A→B re-key, dial-away→null,
        // dial-back→spec). A fresh owner is minted on every (re)entry — never a resurrected identity.
        // This watcher's `immediate` seats the INITIAL phase (open/released) at mount.
        watch(
            () => toValue(specSource)?.key ?? null,
            (key) => {
                if (handle && handle.key !== key) {
                    handle.release();
                    handle = null;
                }
                if (key !== null && !handle) {
                    const spec = toValue(specSource);
                    if (!spec) return;
                    handle = claim(spec);
                    handle.setPhase(toValue(open) ? "open" : "released");
                }
            },
            { immediate: true },
        );

        // Phase: drive the live handle as the bound open-state toggles. NON-immediate (the key watcher
        // above seats the initial phase), so this fires only on an actual open↔close TRANSITION — never
        // on mount, so a surface that starts closed never runs a spurious close transaction / focus grab.
        watch(
            () => toValue(open),
            (isOpen) => {
                if (!handle) return;
                if (isOpen) {
                    handle.setPhase("open");
                    return;
                }
                // The close → focus → release TRANSACTION (S3). With a `restoreFocus` hook the pin holds
                // through `closing`, focus is restored while the receiver is still rendered, and only
                // THEN does the pin relinquish (`focus-restored` → `released`). Without a hook a false
                // edge relinquishes directly (the banked already-open behavior).
                if (!transaction?.restoreFocus) {
                    handle.setPhase("released");
                    return;
                }
                handle.setPhase("closing");
                transaction.restoreFocus();
                handle.setPhase("focus-restored");
                handle.setPhase("released");
            },
        );

        // Deterministic teardown — unmount / route-change / HMR dispose evicts the claim with no residue.
        onScopeDispose(() => handle?.release());
    };

    return { anyHeld, heldKeys, census, topmost, claim, claimOpen };
}

const DOCK_PORTALS_KEY: InjectionKey<DockPortalRegistry> = Symbol("atlas-dock-portals");

/** Provide ONE registry for a dock/app root (PlatformShell) so the dock, the drawer, and every plate
    reach the SAME scope's registry through inject — and two independent roots stay isolated. */
export function provideDockPortals(): DockPortalRegistry {
    const registry = createDockPortalRegistry();
    provide(DOCK_PORTALS_KEY, registry);
    return registry;
}

/** Reach the current dock/app scope's portal registry. Falls back to a fresh isolated instance when no
    provider is present (an out-of-shell unit mount) — never a shared module singleton. */
export function useDockPortals(): DockPortalRegistry {
    return inject(DOCK_PORTALS_KEY, null) ?? createDockPortalRegistry();
}
