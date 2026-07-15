import type { EChartsOption } from "echarts";
import type { MarkIdentity, MorphTransition } from "./viz-set";

type Series = Record<string, unknown> & { data?: unknown[] };

/** Give every mark a stable ECharts id so view changes match by identity, never array position. */
export function withMorphIdentity(option: EChartsOption, identity: MarkIdentity): EChartsOption {
    const copy = { ...option } as EChartsOption & { series?: Series | Series[] };
    const series = copy.series == null ? [] : Array.isArray(copy.series) ? copy.series : [copy.series];
    copy.series = series.map((raw, seriesIndex) => {
        const data = Array.isArray(raw.data) ? raw.data : undefined;
        return {
            ...raw,
            id: `${identity.field}:${seriesIndex}`,
            universalTransition: {
                enabled: true,
                divideShape: "clone",
                seriesKey: identity.field,
            },
            data: data?.map((datum: unknown) => {
                if (!datum || typeof datum !== "object") return datum;
                const item = datum as Record<string, unknown>;
                const key = item[identity.field];
                return item.id == null && key != null
                    ? { ...item, id: String(key) }
                    : item;
            }),
        };
    });
    return copy;
}

/** Add animation only to the one option pushed for a view change. */
export function armMorphPush(option: EChartsOption, transition: MorphTransition): EChartsOption {
    if (transition.reduced) return { ...option, animation: false };
    return {
        ...option,
        animation: true,
        animationDurationUpdate: transition.mode === "staged" ? 760 : 520,
        animationEasingUpdate: "cubicInOut",
    };
}

/** Cheap structural fingerprint for ordinary data paints; the active view is intentionally external. */
export function vizSetFingerprint(parts: readonly unknown[]): string {
    return JSON.stringify(parts);
}
