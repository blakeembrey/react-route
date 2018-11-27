import pathToRegexp = require("path-to-regexp");
import * as React from "react";
import { Context, SimpleLocation } from "@blakeembrey/react-location";

/**
 * Path matching options.
 */
export type Options = pathToRegexp.RegExpOptions & pathToRegexp.ParseOptions;

/**
 * Simple nested router support.
 */
export class RouteLocation extends SimpleLocation {
  constructor(
    url: URL,
    public parent: SimpleLocation,
    public options: Options = {}
  ) {
    super(url);
  }

  get fullUrl(): URL {
    if (this.parent instanceof RouteLocation) return this.parent.fullUrl;
    return this.parent.url;
  }

  push(location: string) {
    return this.parent.push(location);
  }

  compile(path: string, params: object) {
    return pathToRegexp.compile(path, this.options)(params);
  }
}

/**
 * Route render function.
 */
export type RouteChildren = (
  params: string[],
  url: URL,
  location: RouteLocation
) => React.ReactNode;

/**
 * Props for path matching.
 */
export interface RouteProps {
  path: string;
  options?: Options;
  children: RouteChildren;
}

/**
 * Simple path matching component.
 */
export function Route({ path, options, children }: RouteProps) {
  const location = React.useContext(Context);
  const router = getRouter(location);
  const match = router.use(path, options);

  if (!match) return null;

  const { url } = location;
  const { params, value, index } = match;

  const newPathname =
    url.pathname.slice(0, index) + url.pathname.slice(index + value.length);
  const newPath = `${newPathname || "/"}${url.search}${url.hash}`;
  const newUrl = new URL(newPath, url.href);
  const newLocation = new RouteLocation(newUrl, location, options);

  return (
    <Context.Provider value={newLocation}>
      {children(params, newUrl, newLocation)}
    </Context.Provider>
  );
}

type Match = { value: string; index: number; params: string[] } | false;
type Route = [RegExp, (match: Match) => void];

/**
 * Create a router shared between `<Route />` components.
 */
class Router {
  routes: Array<Route> = [];
  matched?: Route;
  unsubscribe?: () => void;

  constructor(public location: SimpleLocation) {}

  match(re: RegExp) {
    const { url } = this.location;
    const m = re.exec(url.pathname);
    if (!m) return false;

    const params = toParams(m);
    if (!params) return false;

    const value = m[0];
    const index = m.index;

    return { value, params, index };
  }

  update() {
    // No routes matched.
    this.matched = undefined;

    for (const route of this.routes) {
      const [re, updateMatch] = route;
      const match = this.matched ? false : this.match(re);

      // Update every match which will re-render state change.
      updateMatch(match);
    }
  }

  track(route: Route) {
    this.routes.push(route);

    // Start listening for changes on the first route added.
    if (this.routes.length === 1) {
      this.unsubscribe = this.location.onChange(() => this.update());
    }

    return () => {
      this.routes.splice(this.routes.indexOf(route), 1);

      // Navigate when the currently matching route is removed.
      if (this.matched === route) this.update();

      // Remove route change subscription when no routes remain.
      if (this.routes.length === 0 && this.unsubscribe) this.unsubscribe();
    };
  }

  use(path: string, options?: Options): Match {
    const re = React.useMemo(() => pathToRegexp(path, undefined, options), [
      path,
      options
    ]);

    const initialValue = this.matched ? false : this.match(re);
    const [match, updateMatch] = React.useState<Match>(initialValue);

    // Track route for matching later.
    const route: Route = [re, updateMatch];

    // Track the matching route globally.
    if (match) this.matched = route;

    // Track router changes.
    React.useLayoutEffect(() => this.track(route), [re]);

    return match;
  }
}

/**
 * Route render tracking.
 */
const routers = new WeakMap<SimpleLocation, Router>();

/**
 * Get the router for a location.
 */
function getRouter(key: SimpleLocation) {
  if (!routers.has(key)) routers.set(key, new Router(key));
  return routers.get(key)!;
}

/**
 * Transform a regexp result into a list of params.
 */
function toParams(m: RegExpExecArray) {
  const params: string[] = Array(m.length - 1);

  // Decode URL parameters for route.
  for (let i = 1; i < m.length; i++) {
    try {
      params[i - 1] = decodeURIComponent(m[i]);
    } catch (e) {
      return; // Bail from router on bad URL.
    }
  }

  return params;
}
