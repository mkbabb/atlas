<script setup lang="ts">
// chrome/filter/components/FilterDrawerFoot.vue (I-ARCH.AR-3) — the filter drawer's FOOT,
// lifted out of the FilterPanel host into a presentational sub-component (the §Y
// componentize: the host shrinks, the foot cluster is one unit). It carries the three
// foot strata: the saved-views SAVE affordance (bookmark the full URL state under a name),
// the cross-dashboard hand-off links (the ECF↔USF fips bridge), and the freshness colophon
// (the data-vintage chip, re-weighted to the active year). PURE chrome — the save form
// state + the resolved links + the freshness label are props; the foot emits the save
// intents up to the host (the host owns the `useSavedViews` write). The markup is
// byte-identical to the inline `<footer class="cp-drawer__foot">` it replaces.
import { Button } from "@mkbabb/glass-ui/button";
import { X, ArrowRightLeft, Bookmark } from "@lucide/vue";

interface ResolvedCrossLink {
    label: string;
    to: { path: string; query?: Record<string, string> };
    ready: boolean;
}

defineProps<{
    /** The resolved cross-dashboard hand-off links (the RouterLink targets). */
    crossLinks: ResolvedCrossLink[];
    /** The freshness colophon label, re-weighted to the active year scope. */
    freshness: string;
    /** Whether the save-name form is open (else the bookmark button shows). */
    saveOpen: boolean;
    /** The bound save-name field value (host owns the model). */
    saveName: string;
}>();

const emit = defineEmits<{
    /** Open the name prompt (the host pre-fills the default label). */
    openSave: [];
    /** Commit the current URL to the shelf under the typed name. */
    commitSave: [];
    /** Dismiss the name prompt without saving. */
    cancelSave: [];
    /** The save-name field input (two-way bridge to the host's model). */
    "update:saveName": [value: string];
}>();
</script>

<template>
    <footer class="cp-drawer__foot">
        <!-- The saved-views save affordance — bookmark the full URL state
             (filter + year + selection) under a name. -->
        <div class="cp-drawer__save" data-testid="save-view">
            <Button
                v-if="!saveOpen"
                variant="glass-wash"
                size="sm"
                data-testid="save-view-open"
                @click="emit('openSave')"
            >
                <Bookmark class="h-3.5 w-3.5" aria-hidden="true" />
                Save view
            </Button>
            <form
                v-else
                class="cp-drawer__save-form"
                @submit.prevent="emit('commitSave')"
            >
                <label class="sr-only" for="save-view-name">Name this view</label>
                <input
                    id="save-view-name"
                    :value="saveName"
                    type="text"
                    class="cp-drawer__save-input"
                    placeholder="Name this view"
                    data-testid="save-view-name"
                    autocomplete="off"
                    @input="
                        emit(
                            'update:saveName',
                            ($event.target as HTMLInputElement).value,
                        )
                    "
                    @keydown.esc="emit('cancelSave')"
                />
                <Button
                    variant="accent"
                    size="sm"
                    type="submit"
                    data-testid="save-view-confirm"
                >
                    Save
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Cancel saving view"
                    @click="emit('cancelSave')"
                >
                    <X class="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
            </form>
        </div>

        <!-- The cross-dashboard hand-offs — a RouterLink carrying ?fips=. -->
        <nav
            v-if="crossLinks.length"
            class="cp-drawer__crosslinks"
            aria-label="Related dashboards"
        >
            <RouterLink
                v-for="link in crossLinks"
                :key="link.to.path"
                :to="link.to"
                class="cp-drawer__crosslink"
                :class="{ 'cp-drawer__crosslink--pending': !link.ready }"
                data-testid="cross-link"
                :aria-disabled="!link.ready || undefined"
                :title="link.ready ? undefined : 'Coming soon'"
            >
                <ArrowRightLeft class="h-3.5 w-3.5" aria-hidden="true" />
                {{ link.label }}
                <span v-if="!link.ready" class="cp-drawer__crosslink-soon">soon</span>
            </RouterLink>
        </nav>
        <span
            v-if="freshness"
            class="cp-drawer__freshness"
            data-testid="freshness-chip"
        >
            {{ freshness }}
        </span>
    </footer>
</template>

<style scoped>
.cp-drawer__foot {
    padding: 0.55rem 1rem 0.7rem;
    border-top: 1px solid var(--border);
}
.cp-drawer__freshness {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--muted-foreground);
    letter-spacing: 0.02em;
}

/* The save-view row — a quiet bookmark affordance that swaps to a name field. */
.cp-drawer__save {
    margin-bottom: 0.5rem;
}
/* The save / confirm / cancel affordances are glass `Button`s (glass-wash · accent ·
   ghost icon) — they OWN their own surface/hover/focus/radius. Only the save FORM row
   layout + the text INPUT skin remain the foot's to keep. */
.cp-drawer__save-form {
    display: flex;
    align-items: center;
    gap: 0.35rem;
}
.cp-drawer__save-input {
    flex: 1 1 auto;
    min-width: 0;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--background);
    font-size: 0.72rem;
    color: var(--foreground);
}
.cp-drawer__save-input:focus-visible {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 0;
}

/* The cross-dashboard hand-off row — sits above the freshness colophon. */
.cp-drawer__crosslinks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
}
.cp-drawer__crosslink {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.55rem;
    border: 1px solid
        color-mix(in srgb, var(--accent, var(--primary)) 35%, var(--border));
    border-radius: var(--radius-pill);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--ink-primary); /* O-C7 D5 — the drawer crosslink as a readable primary ink */
    text-decoration: none;
}
.cp-drawer__crosslink:hover {
    background: color-mix(in srgb, var(--accent, var(--primary)) 9%, transparent);
}
.cp-drawer__crosslink:focus-visible {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 1px;
}
.cp-drawer__crosslink--pending {
    color: var(--muted-foreground);
    border-color: var(--border);
    cursor: default;
    opacity: 0.7;
}
.cp-drawer__crosslink-soon {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.8;
}
</style>
