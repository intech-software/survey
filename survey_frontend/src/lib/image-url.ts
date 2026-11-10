export function getOriginalImageUrl(src: string): string;
export function getOriginalImageUrl(src: null): null;
export function getOriginalImageUrl(src: undefined): undefined;
export function getOriginalImageUrl(
  src: string | null | undefined,
): string | null | undefined {
  if (!src) {
    return src;
  }

  const hashIndex = src.indexOf("#");
  const hash = hashIndex >= 0 ? src.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? src.slice(0, hashIndex) : src;
  const queryIndex = withoutHash.indexOf("?");
  const pathname =
    queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(query);

  params.set("original", "true");

  return `${pathname}?${params.toString()}${hash}`;
}
