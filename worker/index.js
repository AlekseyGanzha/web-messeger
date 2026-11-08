const API_ORIGIN = "https://web-messager-api.onrender.com";
const WEB_ORIGIN = "https://web-messager-web.onrender.com";
const API_PREFIXES = ["/api", "/socket.io", "/uploads", "/health"];

function isApiPath(pathname) {
  return API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const origin = isApiPath(incomingUrl.pathname) ? API_ORIGIN : WEB_ORIGIN;
    const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, origin);

    const upstream = await fetch(new Request(targetUrl, request));
    const location = upstream.headers.get("location");

    if (!location) {
      return upstream;
    }

    const resolved = new URL(location, origin);
    if (resolved.origin !== origin) {
      return upstream;
    }

    const headers = new Headers(upstream.headers);
    headers.set(
      "location",
      new URL(resolved.pathname + resolved.search + resolved.hash, incomingUrl.origin).toString(),
    );

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};
