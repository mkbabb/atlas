import { ref } from "vue";

// The ONE shared request for FilterPanel's full DRAWER register. False means the
// same physical Glass surface rests at PIP; it does not create a second presence or
// geometry state. Dock and plate affordances both target this singleton.
const open = ref(false);

// The route's filter body mounts on first use (U/B7d D1), and the reach arms it, so the mount lands
// before the press and not in the slide's frames. The reach is either of the route's two doors: the
// panel's own, and the dock's trigger, which lives above the router. A new panel starts unarmed.
const bodyArmed = ref(false);
function armBody(): void {
    bodyArmed.value = true;
}

export function useFilterPane() {
    return { open, bodyArmed, armBody };
}
