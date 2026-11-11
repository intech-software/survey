import { NextRequest, NextResponse } from "next/server";
import { API_ROUTES } from "@/lib/api-routes";

const authPaths = ["/login", "/register", "/forgot-password"];
const protectedPaths = ["/", "/home", "/templates", "/profile", "/setting"];
const backendBaseUrl =
  process.env.NEXT_SERVER_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
const refreshEndpoint = API_ROUTES.auth.refreshToken;
const isSecureCookie = process.env.NODE_ENV === "production";
const isHttpOnlyCookie = process.env.COOKIE_HTTP_ONLY === "true";

export default async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const hasAccessToken = Boolean(accessToken);
  const hasRefreshToken = Boolean(refreshToken);
  const isLoggedIn = hasAccessToken && hasRefreshToken;
  const { pathname } = request.nextUrl;
  const isAuthPath = authPaths.includes(pathname);
  const isProtectedPath = protectedPaths.some((path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path),
  );

  // Refresh before any redirect. An expired access-token cookie can disappear
  // while the refresh-token cookie is still valid, including on `/login`.
  const needsAccessTokenRefresh =
    hasRefreshToken && (!hasAccessToken || isAccessTokenExpired(accessToken));
  if (needsAccessTokenRefresh) {
    const refreshResponse = await refreshAccessToken(request, refreshToken);
    if (refreshResponse) {
      return refreshResponse;
    }

    if (isProtectedPath || isAuthPath) {
      return redirectToLoginAndClearAuthCookies(request);
    }
  }

  if (isLoggedIn && isAuthPath) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!isLoggedIn && isProtectedPath) {
    return redirectToLoginAndClearAuthCookies(request);
  }

  return NextResponse.next();
}

const refreshAccessToken = async (
  request: NextRequest,
  refreshToken: string | undefined,
) => {
  if (!refreshToken || !backendBaseUrl) {
    return null;
  }
  try {
    const response = await fetch(`${backendBaseUrl}${refreshEndpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { accessToken?: string };
    if (!data.accessToken) {
      return null;
    }
    const maxAge = getAccessTokenMaxAge(data.accessToken, 15 * 60);
    const redirectResponse = NextResponse.redirect(request.url);
    redirectResponse.cookies.set({
      name: "accessToken",
      value: data.accessToken,
      httpOnly: isHttpOnlyCookie,
      sameSite: "lax",
      path: "/",
      maxAge,
      secure: isSecureCookie,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    return redirectResponse;
  } catch {
    return null;
  }
};

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

const isAccessTokenExpired = (token: string | undefined) => {
  if (!token) {
    return true;
  }
  const maxAge = getAccessTokenMaxAge(token, 0);
  return maxAge <= 0;
};

const redirectToLoginAndClearAuthCookies = (request: NextRequest) => {
  const response = NextResponse.redirect(new URL("/login", request.url));
  for (const name of ["accessToken", "refreshToken"]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: isHttpOnlyCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: isSecureCookie,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
  }
  return response;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  if (typeof atob === "function") {
    return atob(padded);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  throw new Error("No base64 decoder available");
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
