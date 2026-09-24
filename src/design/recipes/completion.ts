// glass-ui 8.0.0 deleted `CompletionSeal` and relayed it here: atlas owns the seal
// (`@/editorial/CompletionSeal.vue`) and this recipe stays its one resolver.
import CompletionSeal, {
    type CompletionSealProps,
    type CompletionSealShape,
} from "@/editorial/CompletionSeal.vue";

export { CompletionSeal, type CompletionSealProps, type CompletionSealShape };

export interface CompletionRecipeInput {
    complete: boolean;
    label: string;
    shape: CompletionSealShape;
}

/** Mount on completion so the seal owns the one-shot draw and reduced-motion snap. */
export function resolveCompletionSeal(
    input: CompletionRecipeInput,
): CompletionSealProps | null {
    if (!input.complete) return null;
    return { label: input.label, shape: input.shape, play: true };
}
