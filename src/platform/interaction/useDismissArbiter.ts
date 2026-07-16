import {
    inject,
    onBeforeUnmount,
    onMounted,
    provide,
    shallowRef,
    watchEffect,
    type InjectionKey,
    type MaybeRefOrGetter,
    type ShallowRef,
} from "vue";
import { toValue } from "vue";
import { createDismissArbiter, type DismissArbiter, type DismissClaim } from "./dismiss-arbiter.js";

const DISMISS_ARBITER_KEY: InjectionKey<ShallowRef<DismissArbiter | null>> = Symbol("atlas-dismiss-arbiter");

export function provideDismissArbiter(): ShallowRef<DismissArbiter | null> {
    const arbiter = shallowRef<DismissArbiter | null>(null);
    provide(DISMISS_ARBITER_KEY, arbiter);
    onMounted(() => {
        if (typeof document !== "undefined") arbiter.value = createDismissArbiter(document);
    });
    onBeforeUnmount(() => {
        arbiter.value?.destroy();
        arbiter.value = null;
    });
    return arbiter;
}

export interface UseDismissArbiterReturn {
    claim: (claim: MaybeRefOrGetter<DismissClaim | null>) => void;
}

export function useDismissArbiter(
    supplied?: ShallowRef<DismissArbiter | null>,
): UseDismissArbiterReturn {
    const arbiter = supplied ?? inject(DISMISS_ARBITER_KEY, shallowRef(null));
    return {
        claim(source) {
            watchEffect((cleanup) => {
                const value = toValue(source);
                if (!value || !arbiter.value) return;
                cleanup(arbiter.value.claim(value));
            });
        },
    };
}
