export const normalizeSearchText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export const getSearchScopePath = (pathname: string) => {
  const [, section] = pathname.split("/");

  return section ? `/${section}` : pathname;
};

export const matchesSearchKeyword = (
  values: unknown[],
  searchKeyword: string,
) => {
  const normalizedKeyword = normalizeSearchText(searchKeyword).trim();

  if (!normalizedKeyword) {
    return true;
  }

  return values.some((value) =>
    normalizeSearchText(value).includes(normalizedKeyword),
  );
};
