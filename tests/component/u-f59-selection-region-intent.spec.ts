import { createRenderer, createSSRApp, defineComponent, h, nextTick, ref, ssrContextKey } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import SelectionRegion from "../../src/charts/geo/SelectionRegion.vue";

// U-F59a / U-F29 trigger (homed in atlas by sci-report §H M-5): SelectionRegion's `active-change`
// is reader intent. It never fires at setup or for an unfocused cursor, and it clears only what it
// raised. Before this cure the region emitted `keys[0]` from an `immediate` setup watcher; this file
// fails on that head (the SSR case and the first mount case).

/** The spec runs in vitest's Node (SSR-transform) environment, where an SFC compiles to `ssrRender`
    and its dev-mode `setup` returns its bindings. So the region is mounted through a minimal custom
    host renderer (real reactivity, watchers and lifecycle; no DOM), its bindings are captured, and
    its own focus/keydown/blur handlers are called directly. The SSR context the compiled setup
    registers its module in is provided. */
type Bindings = { onFocus(): void; onBlur(): void; onKeydown(e: unknown): void };
interface FakeNode {
    tag: string;
    children: FakeNode[];
    parent: FakeNode | null;
}
const node = (tag: string): FakeNode => ({ tag, children: [], parent: null });
const { createApp } = createRenderer<FakeNode, FakeNode>({
    createElement: node,
    createText: () => node("#text"),
    createComment: () => node("#comment"),
    setText: () => {},
    setElementText: () => {},
    insert: (child, parent) => {
        child.parent = parent;
        parent.children.push(child);
    },
    remove: (child) => {
        const p = child.parent;
        if (p) p.children.splice(p.children.indexOf(child), 1);
        child.parent = null;
    },
    parentNode: (n) => n.parent,
    nextSibling: () => null,
    patchProp: () => {},
});
const key = (k: string) => ({ key: k, preventDefault() {}, shiftKey: false, metaKey: false, ctrlKey: false });

function mountRegion(keys: string[], onSelect?: (ev: unknown) => void) {
    const emitted: (string | null)[] = [];
    const keyList = ref(keys);
    const show = ref(true);
    let bindings: Bindings | null = null;
    const Region = defineComponent({
        ...(SelectionRegion as object),
        setup(props: unknown, ctx: unknown) {
            const setup = (SelectionRegion as unknown as { setup: (p: unknown, c: unknown) => Bindings }).setup;
            bindings = setup(props, ctx);
            return bindings;
        },
        render: () => null,
    });
    const Host = defineComponent(() => () =>
        show.value
            ? h(Region, {
                  keys: keyList.value,
                  label: (k: string) => k,
                  selectedKeys: new Set<string>(),
                  onActiveChange: (k: string | null) => emitted.push(k),
                  onSelect,
              })
            : null,
    );
    const app = createApp(Host);
    app.provide(ssrContextKey, {});
    app.mount(node("root"));
    const call = (name: keyof Bindings, arg?: unknown) => (bindings![name] as (a?: unknown) => void)(arg);
    return { emitted, keyList, show, app, call };
}

describe("U-F59a — SelectionRegion emits reader intent only", () => {
    it("emits nothing during SSR setup", async () => {
        const emitted: (string | null)[] = [];
        await renderToString(
            createSSRApp({
                render: () =>
                    h(SelectionRegion, {
                        keys: ["filer-0001", "filer-0002"],
                        label: (k: string) => k,
                        selectedKeys: new Set<string>(),
                        onActiveChange: (k: string | null) => emitted.push(k),
                    }),
            }),
        );
        expect(emitted).toEqual([]);
    });

    it("emits nothing on mount, nor when the key list changes under an unfocused cursor", async () => {
        const r = mountRegion(["010", "020", "030"]);
        await nextTick();
        expect(r.emitted).toEqual([]);
        r.keyList.value = ["030", "020"];
        await nextTick();
        expect(r.emitted).toEqual([]);
        r.app.unmount();
        expect(r.emitted).toEqual([]);
    });

    it("raises on focus, follows the arrow keys, and clears on blur", async () => {
        const r = mountRegion(["a", "b", "c"]);
        r.call("onFocus");
        r.call("onKeydown", key("ArrowDown"));
        await nextTick();
        r.call("onBlur");
        expect(r.emitted).toEqual(["a", "b", null]);
        r.app.unmount();
    });

    it("a key-list change while focused moves the ring; after blur it is quiet again", async () => {
        const r = mountRegion(["a", "b"]);
        r.call("onFocus");
        r.keyList.value = ["z", "b"];
        await nextTick();
        r.call("onBlur");
        r.keyList.value = ["y", "b"];
        await nextTick();
        expect(r.emitted).toEqual(["a", "z", null]);
        r.app.unmount();
    });

    it("releases a raised key when it unmounts while focused, and only then", async () => {
        const r = mountRegion(["a", "b"]);
        r.call("onFocus");
        r.show.value = false;
        await nextTick();
        expect(r.emitted).toEqual(["a", null]);
        r.app.unmount();
    });

    it("keeps the select contract: Enter selects the cursor key, Escape clears", async () => {
        const selects: unknown[] = [];
        const r = mountRegion(["a", "b"], (ev) => selects.push(ev));
        r.call("onKeydown", key("Enter"));
        r.call("onKeydown", key("Escape"));
        expect(selects).toEqual([
            { key: "a", multi: false },
            { key: "", multi: false },
        ]);
        expect(r.emitted).toEqual([]);
        r.app.unmount();
    });
});
