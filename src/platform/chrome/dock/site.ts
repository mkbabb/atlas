// site.ts — the site layer's inputs (U/B7 §2.2, §2.3). The dock is mounted once by `SiteShell`, which
// passes these through; the instance supplies them (atlas holds no tenant's subjects or digests).

/** One entry of the subject index the roster's "By subject" row opens. */
export interface SiteSubject {
    /** The subject's name as the reader sees it (for example "Connectivity"). */
    label: string;
    /** The route the entry opens (for example "/c/connectivity"). */
    to: string;
}

/** One search result: what the reader reads and where it goes. */
export interface SiteSearchItem {
    label: string;
    to: string;
}

/** A search source beyond the dashboards (for example the school units). It loads on the first
    focus of Search, so no route's first paint carries it. */
export interface SiteSearchSource {
    /** The group heading the results sit under (for example "School units"). */
    group: string;
    /** Load the items once; the dock memoizes the result. */
    load: () => Promise<readonly SiteSearchItem[]>;
}
