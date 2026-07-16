// platform/charts/lib/vizExport.ts — THE E3 EXPORT SERIALIZERS (I2.a · DESIGN §2.2.6 / §3.7).
//
// The host (`VizPlate`) wires the export glyph ONCE from a contract's `ExportSpec`; this module
// owns the three serializers it dispatches to — chosen by the contract's `render` KIND:
//   • CSV   — off the `ChartDataTable` a11y rows (the row set IS the data payload, ONE source).
//   • PNG   — the canvas vizes (`render:"echarts"`) serialize via ECharts native `getDataURL`;
//             the SVG/geo vizes (`render:"svg"|"geo"`) via a DOM-snapshot using the platform's
//             OWN serialization (XMLSerializer → an SVG data-URL → no rasterizer needed).
//
// ZERO NEW HEAVY DEP (I2 Hard Gate 6): no `jspdf`, no `html2canvas`. The PNG path is ECharts'
// own `getDataURL` (already in the graph); the SVG/geo path is the browser's `XMLSerializer`
// (no lib). The "PDF" affordance the gate looks for is satisfied KISS by the print path the
// host owns (`window.print()` over the `@media print` expand layer) — no binary-PDF library.

import type { ChartDataRow } from "../legend/ChartDataTable.vue";
import type { VizRenderKind } from "../contract/viz-contract.js";
import type { ProvenanceFacet } from "../../platform/provenance/provenance-contract.js";

/** An ECharts-instance shape with the one method the canvas export reaches for. The host passes
    the live `chart` ref through; we only need `getDataURL` (the native PNG seam). */
export interface DataUrlSource {
    getDataURL(opts?: {
        type?: "png" | "jpeg" | "svg";
        pixelRatio?: number;
        backgroundColor?: string;
    }): string;
}

/** Trigger a browser download of `data` (a string or Blob) under `filename`. The ONE download
    primitive both the CSV and the PNG paths reach — an anchor click on an object URL, revoked
    after the click (no leak, no lib). */
export function triggerDownload(
    data: string | Blob,
    filename: string,
    mime: string,
): void {
    const blob = typeof data === "string" ? new Blob([data], { type: mime }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // revoke on the next tick so the click's navigation has consumed the URL.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Escape one CSV cell — quote if it carries a comma / quote / newline, doubling inner quotes
    (RFC-4180). KISS, zero-dep. */
function csvCell(s: string): string {
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

/** Serialize the a11y rows to a CSV string (the §E3 payload — the `ChartDataTable` rows ARE the
    export). Declared provenance, when present, leads as a two-column metadata preamble; the blank
    line keeps the contract's data header + rows byte-for-byte tabular and easy to locate. */
export function rowsToCsv(
    rows: ChartDataRow[],
    rowHeader: string,
    valueHeader: string,
    provenance?: ProvenanceFacet | null,
): string {
    const data = [
        `${csvCell(rowHeader)},${csvCell(valueHeader)}`,
        ...rows.map((r) => `${csvCell(r.name)},${csvCell(r.value)}`),
    ];
    if (!provenance) return data.join("\r\n");

    const metadata = [
        ["# Source", provenance.dataset],
        ["# Sections", provenance.sections?.join(" · ")],
        ["# Attributes", provenance.attributes?.join(" · ")],
        ["# Analysis", provenance.analysis],
        ["# Data range", provenance.yearRange],
        [
            "# Encoding",
            provenance.encoding
                ? `${provenance.encoding.y} vs ${provenance.encoding.x}`
                : undefined,
        ],
    ]
        .filter((row): row is [string, string] => Boolean(row[1]))
        .map(([key, value]) => `${csvCell(key)},${csvCell(value)}`);
    return [...metadata, "", ...data].join("\r\n");
}

/** Export the contract rows as a CSV download. */
export function exportCsv(
    rows: ChartDataRow[],
    rowHeader: string,
    valueHeader: string,
    filename: string,
    provenance?: ProvenanceFacet | null,
): void {
    triggerDownload(
        rowsToCsv(rows, rowHeader, valueHeader, provenance),
        filename,
        "text/csv;charset=utf-8",
    );
}

/** Serialize a live DOM subtree (an `<svg>` host, or any element wrapping one) to an SVG data-URL
    via the browser's `XMLSerializer` — the DOM-snapshot path for `svg`/`geo` vizes. We snapshot
    the first `<svg>` inside `host` (the geo choropleth / point-layer / stacked-bar SVG); when none
    exists the host itself is wrapped in a foreignObject-free SVG shell is NOT attempted (no lib) —
    we fall back to returning null so the host can degrade to CSV-only. */
export function svgDataUrl(host: Element): string | null {
    const svg = host.tagName.toLowerCase() === "svg" ? host : host.querySelector("svg");
    if (!svg) return null;
    const clone = svg.cloneNode(true) as SVGElement;
    // ensure the SVG namespace is present on the clone (a detached clone may lack it).
    if (!clone.getAttribute("xmlns"))
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

/** Export the plate's figure as an image download, dispatched by `render` KIND:
    · `echarts` → ECharts `getDataURL` (PNG, the native canvas seam) when a `chart` source is given;
    · `svg`/`geo` → a DOM-snapshot SVG data-URL off `host`.
    Returns true when an image download fired; false when no serializer applied (the host then
    falls back to CSV-only / print). ZERO heavy dep — getDataURL + XMLSerializer only. */
export function exportImage(
    kind: VizRenderKind,
    filename: string,
    chart: DataUrlSource | null,
    host: Element | null,
): boolean {
    if (kind === "echarts" && chart) {
        const url = chart.getDataURL({
            type: "png",
            pixelRatio: 2,
            backgroundColor: "#fff",
        });
        triggerDownload(
            dataUrlToBlob(url),
            filename.replace(/\.\w+$/, "") + ".png",
            "image/png",
        );
        return true;
    }
    if ((kind === "svg" || kind === "geo") && host) {
        const url = svgDataUrl(host);
        if (url) {
            triggerDownload(
                decodeSvgDataUrl(url),
                filename.replace(/\.\w+$/, "") + ".svg",
                "image/svg+xml",
            );
            return true;
        }
    }
    return false;
}

/** Decode a base64/utf8 PNG data-URL to a Blob (so the download is a real binary, not a string). */
function dataUrlToBlob(dataUrl: string): Blob {
    const [head, body] = dataUrl.split(",");
    const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/png";
    if (head.includes("base64")) {
        const bin = atob(body);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(body)], { type: mime });
}

/** Decode a `data:image/svg+xml,…` data-URL back to its XML string (for the SVG download blob). */
function decodeSvgDataUrl(dataUrl: string): string {
    const body = dataUrl.slice(dataUrl.indexOf(",") + 1);
    return decodeURIComponent(body);
}

/** The KISS PDF path (DESIGN §2.2.6 / §3.7 — "reach for jsPDF only if true binary PDF is signed").
    The export offers a print of the plate via the browser's own print dialog over the `@media print`
    layer the expand owns — ZERO binary-PDF lib. The host calls this for the "PDF" affordance. */
export function exportPrint(): void {
    window.print();
}
