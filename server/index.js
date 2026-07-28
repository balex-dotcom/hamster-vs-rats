function assetRequest(request, pathname) {
  var url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url, request);
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    var pathname = url.pathname;

    if (pathname === "/" || pathname === "") {
      return env.ASSETS.fetch(assetRequest(request, "/index.html"));
    }

    var response = await env.ASSETS.fetch(assetRequest(request, pathname));
    if (response.status !== 404) return response;

    return env.ASSETS.fetch(assetRequest(request, "/index.html"));
  }
};
