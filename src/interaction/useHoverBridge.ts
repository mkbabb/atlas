import { onScopeDispose, type Ref } from "vue";
import { createHoverBridge } from "./hover-bridge.js";

export function useHoverBridge(anchor: Ref<HTMLElement | null>, card: Ref<HTMLElement | null>) {
    // The live pointer the RELEASE edge re-checks against the hull (β-gate F6) — one capture-phase
    // listener per scope, torn down with the bridge. Null until the first move (and under SSR).
    const dom = typeof window !== "undefined";
    let pointer: readonly [number, number] | null = null;
    const track = (event: PointerEvent) => (pointer = [event.clientX, event.clientY]);
    if (dom) window.addEventListener("pointermove", track, true);
    const bridge = createHoverBridge({
        anchor: () => anchor.value?.getBoundingClientRect() ?? null,
        card: () => card.value?.getBoundingClientRect() ?? null,
        pointer: () => pointer,
    });
    onScopeDispose(() => {
        if (dom) window.removeEventListener("pointermove", track, true);
        bridge.destroy();
    });
    return bridge;
}
