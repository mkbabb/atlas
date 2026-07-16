import {
    isColumnarFeed,
    isFeed,
    type Feed,
    type FeedColumnar,
} from "./contract.js";

/** Parse and validate one feed body without choosing where that work runs. */
export function parseFeedBody(text: string, url: string): FeedColumnar | Feed {
    const json: unknown = JSON.parse(text);
    if (isColumnarFeed(json) || isFeed(json)) return json;
    throw new Error(`${url} → not a Feed envelope`);
}
