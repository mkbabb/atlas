// glass-ui 8.0.0 deleted `CompletionSeal` (with `./completion-seal`) and relayed its consumers:
// atlas owns the seal (`editorial/CompletionSeal.vue`), and this recipe stays its one resolver.
import CompletionSeal, {
    type CompletionSealProps,
    type CompletionSealShape,
} from "../../editorial/CompletionSeal.vue";

export { CompletionSeal, type CompletionSealProps, type CompletionSealShape };

export interface CompletionRecipeInput {
    complete: boolean;
    /** Screen-reader text; omit for a decorative seal (no text reaches the page). */
    label?: string;
    shape: CompletionSealShape;
}

/** Mount on completion. The seal renders drawn and still (U/B7 · PLAN §4.2: no load draws). */
export function resolveCompletionSeal(
    input: CompletionRecipeInput,
): CompletionSealProps | null {
    if (!input.complete) return null;
    return { label: input.label, shape: input.shape, play: false };
}
