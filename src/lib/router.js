export function resolveRoute(pathname, search = "") {
  const cleanPath = String(pathname || "/").replace(/\/+$/, "") || "/";
  const segments = cleanPath.split("/").filter(Boolean);
  const query = new URLSearchParams(search || "");

  if (segments.length === 0) {
    return { route: "dashboard", params: {}, query };
  }

  if (segments[0] === "phases" && segments.length === 1) {
    return { route: "phases", params: {}, query };
  }

  if (segments[0] === "phases" && segments[1]) {
    return { route: "phase", params: { phaseId: segments[1] }, query };
  }

  if (segments[0] === "weeks" && segments[1]) {
    return { route: "week", params: { weekId: segments[1] }, query };
  }

  if (segments[0] === "journal") {
    return { route: "journal", params: {}, query };
  }

  if (segments[0] === "patterns") {
    return { route: "patterns", params: {}, query };
  }

  return { route: "dashboard", params: {}, query };
}

export function createPath(route, params = {}) {
  switch (route) {
    case "dashboard":
      return "/";
    case "phases":
      return "/phases";
    case "phase":
      return `/phases/${params.phaseId || params.id || ""}`.replace(/\/+$/, "");
    case "week":
      return `/weeks/${params.weekId || params.id || ""}`.replace(/\/+$/, "");
    case "journal":
      return "/journal";
    case "patterns":
      return "/patterns";
    default:
      return "/";
  }
}

export function withQuery(path, query = {}) {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && String(value).length > 0) {
      search.set(key, String(value));
    }
  });
  const searchString = search.toString();
  return searchString ? `${path}?${searchString}` : path;
}

export function navigateHistory(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
