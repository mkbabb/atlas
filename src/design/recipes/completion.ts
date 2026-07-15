import {
    CompletionSeal,
    type CompletionSealProps,
    type CompletionSealShape,
} from "@mkbabb/glass-ui/completion-seal";

export { CompletionSeal };

export interface CompletionRecipeInput {
    complete: boolean;
    label: string;
    shape: CompletionSealShape;
}

/** Mount on completion so Glass owns the one-shot draw and reduced-motion snap. */
export function resolveCompletionSeal(
    input: CompletionRecipeInput,
): CompletionSealProps | null {
    if (!input.complete) return null;
    return { label: input.label, shape: input.shape, play: true };
}
