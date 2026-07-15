import { readonly, ref, shallowRef, type Ref } from "vue";
import { useDeck } from "@mkbabb/glass-ui/deck";

export interface StageStep {
    from: number;
    to: number;
    direction: "forward" | "back";
}

export interface StageDeck {
    activeIndex: Ref<number>;
    inFlight: Readonly<Ref<StageStep | null>>;
    request: (index: number) => void;
    settle: () => void;
}

/**
 * One discrete stage owner over Glass's published deck core. Geometry may request
 * any detent; the arbiter exposes only adjacent transitions and waits for the
 * consumer's existing motion to settle before advancing again.
 */
export function useStageDeck(
    count: number,
    onStep: (step: StageStep) => void,
): StageDeck {
    const deck = useDeck(count);
    const targetIndex = ref(deck.index.value);
    const inFlight = shallowRef<StageStep | null>(null);

    function advance(): void {
        if (inFlight.value || deck.index.value === targetIndex.value) return;
        const from = deck.index.value;
        const to = from + Math.sign(targetIndex.value - from);
        const step: StageStep = {
            from,
            to,
            direction: to > from ? "forward" : "back",
        };
        inFlight.value = step;
        deck.go(to);
        onStep(step);
    }

    function request(index: number): void {
        targetIndex.value = Math.max(0, Math.min(count - 1, index));
        advance();
    }

    function settle(): void {
        if (!inFlight.value) return;
        inFlight.value = null;
        advance();
    }

    return {
        activeIndex: deck.index,
        inFlight: readonly(inFlight),
        request,
        settle,
    };
}
