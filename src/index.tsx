import pathToRegexp = require("path-to-regexp");
import * as React from "react";
import {
  Context,
  SimpleLocation,
  Router as LocationRouter
} from "@blakeembrey/react-location";

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
 * Props for path matching.
 */
export interface RouteProps {
  path: pathToRegexp.Path;
  options?: Options;
  children: (
    params: string[],
    url: URL,
    location: RouteLocation
  ) => React.ReactNode;
}

/**
 * Simple path matching component.
 */
export function Route({ path, options, children }: RouteProps) {
  const { result, location } = useRouter(path, options);

  if (!result) return null;

  const { url } = location;
  const { params, value, index } = result;

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

/**
 * Unconditionally render a `<Match />` component.
 */
export interface MatchProps {
  path: pathToRegexp.Path;
  options?: Options;
  children: (match: Match, location: SimpleLocation) => React.ReactNode;
}

/**
 * Create a `match` function.
 */
export function Match({ path, options, children }: MatchProps) {
  const re = usePath(path, options);

  return (
    <LocationRouter>
      {(url, location) => children(match(re, url), location)}
    </LocationRouter>
  );
}

/**
 * Match result.
 */
export type Match = { value: string; index: number; params: string[] } | false;

/**
 * Create a router shared between `<Route />` components.
 */
class Router {
  routes: Array<(url: URL) => void> = [];
  matched?: RegExp;
  unsubscribe?: () => void;

  constructor(public location: SimpleLocation) {}

  refresh() {
    // Reset matched route.
    this.matched = undefined;

    // Refresh all tracked routes.
    for (const update of this.routes) update(this.location.url);
  }

  match(re: RegExp, url: URL) {
    if (this.matched) return false;
    const result = match(re, url);
    if (result) this.matched = re;
    return result;
  }

  track(re: RegExp, update: (match: URL) => void) {
    // Push current route to track on routes.
    this.routes.push(update);

    // Start listening for changes on the first route added.
    if (this.routes.length === 1) {
      this.unsubscribe = this.location.onChange(() => this.refresh());
    }

    return () => {
      this.routes.splice(this.routes.indexOf(update), 1);

      // Navigate when the currently matching route is removed.
      if (this.matched === re) this.refresh();

      // Remove route change subscription when no routes remain.
      if (this.routes.length === 0 && this.unsubscribe) this.unsubscribe();
    };
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
 * Use `router`. Encapsulates matching and updates to route.
 */
export function useRouter(path: pathToRegexp.Path, options?: Options) {
  const location = React.useContext(Context);
  const re = usePath(path, options);
  const router = getRouter(location);

  // Use `state` to track route matches, avoids re-rendering on `false`.
  const [result, update] = React.useReducer<Match, URL>(
    (_, url) => router.match(re, url),
    false,
    location.url
  );

  // Track router changes.
  React.useLayoutEffect(() => router.track(re, update));

  return { location, result };
}

/**
 * Create a `path-to-regexp` result from path + options.
 */
function usePath(path: pathToRegexp.Path, options?: Options) {
  return React.useMemo(() => pathToRegexp(path, undefined, options), [
    path,
    options
  ]);
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

/**
 * Match a URL using a regexp.
 */
function match(re: RegExp, url: URL): Match {
  const m = re.exec(url.pathname);
  if (!m) return false;

  const params = toParams(m);
  if (!params) return false;

  const value = m[0];
  const index = m.index;

  return { value, params, index };
}
