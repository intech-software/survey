const httpOnlySegment = process.env.COOKIE_HTTP_ONLY === "true" ? "; HttpOnly" : "";
export async function POST(request: Request) {
  const payload = await request.json();
  const accessToken = payload?.accessToken || null;
  const refreshToken = payload?.refreshToken || null;
  if (!accessToken) {
    return Response.json(
      { error: "Access token is required" },
      { status: 400 }
    );
  }
  if (!refreshToken) {
    return Response.json(
      { error: "Refresh token is required" },
      { status: 400 }
    );
  }
  const refreshMaxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  const defaultAccessMaxAge = 15 * 60; // 15 minutes in seconds
  const accessMaxAge = getAccessTokenMaxAge(accessToken, defaultAccessMaxAge);
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const domainSegment = cookieDomain ? `; Domain=${cookieDomain}` : "";
  const secureSegment = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    { payload },
    {
      status: 200,
      headers: {
        "Set-Cookie": [
          `accessToken=${accessToken}; Path=/${httpOnlySegment}; SameSite=Lax; Max-Age=${accessMaxAge}${domainSegment}${secureSegment}`,
          refreshToken
            ? `refreshToken=${refreshToken}; Path=/${httpOnlySegment}; SameSite=Lax; Max-Age=${refreshMaxAge}${domainSegment}${secureSegment}`
            : "",
        ]
          .filter(Boolean)
          .join(", "),
      },
    }
  );
}

export async function DELETE() {
  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const domainSegment = cookieDomain ? `; Domain=${cookieDomain}` : "";
  const secureSegment = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": [
          `accessToken=; Path=/${httpOnlySegment}; SameSite=Lax; Max-Age=0${domainSegment}${secureSegment}`,
          `refreshToken=; Path=/${httpOnlySegment}; SameSite=Lax; Max-Age=0${domainSegment}${secureSegment}`,
        ].join(", "),
      },
    }
  );
}

const getAccessTokenMaxAge = (token: string, fallbackSeconds: number) => {
  try {
    const [, payloadBase64] = token.split(".");
    if (!payloadBase64) {
      return fallbackSeconds;
    }
    const payloadJson = decodeBase64Url(payloadBase64);
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (typeof payload.exp !== "number") {
      return fallbackSeconds;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    const maxAge = payload.exp - nowSeconds;
    return maxAge > 0 ? maxAge : fallbackSeconds;
  } catch {
    return fallbackSeconds;
  }
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  if (typeof atob === "function") {
    return atob(padded);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  throw new Error("No base64 decoder available");
};
