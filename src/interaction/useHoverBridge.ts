import { onScopeDispose, type Ref } from "vue";
import { createHoverBridge } from "./hover-bridge";

export function useHoverBridge(anchor: Ref<HTMLElement | null>, card: Ref<HTMLElement | null>) {
    const bridge = createHoverBridge({
        anchor: () => anchor.value?.getBoundingClientRect() ?? null,
        card: () => card.value?.getBoundingClientRect() ?? null,
    });
    onScopeDispose(bridge.destroy);
    return bridge;
}
