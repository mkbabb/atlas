import { ref } from "vue";

// The ONE shared request for FilterPanel's full DRAWER register. False means the
// same physical Glass surface rests at PIP; it does not create a second presence or
// geometry state. Dock and plate affordances both target this singleton.
const open = ref(false);

export function useFilterPane() {
    return { open };
}
