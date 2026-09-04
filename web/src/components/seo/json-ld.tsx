import { serializeJsonLd } from "@/lib/json-ld";

export interface JsonLdProps {
  data: object;
}

/** The single dangerouslySetInnerHTML in this codebase - guarded by
 * serializeJsonLd's whole-string escape of <, >, and &. See
 * lib/no-dangerous-html.test.ts, which asserts this is the only
 * occurrence anywhere in src/. */
export function JsonLd({ data }: JsonLdProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
