import { p4, p10 } from "../../lib";
export const aContext = { id: "a", note: [p4, p10].map((p) => p()).join(" ") };
