import pathToRegexp = require("path-to-regexp");
import * as React from "react";
import {
  Context,
  SimpleLocation,
  Redirect as LocationRedirect,
  Router as LocationRouter
} from "@blakeembrey/react-location";

/**
 * Route render tracking.
 */
const LOCATION_SYMBOL = Symbol("ReactRoute");

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
    public options: pathToRegexp.ParseOptions = {}
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

  track(re: RegExp, update: (url: URL) => void) {
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
 * Get the router for a location.
 */
function getRouter(location: SimpleLocation & { [LOCATION_SYMBOL]?: Router }) {
  let router = location[LOCATION_SYMBOL];
  if (!router) router = location[LOCATION_SYMBOL] = new Router(location);
  return router;
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
 * Create a `RouteLocation` based on parent location and options.
 */
function useRoute(parent: SimpleLocation, options?: pathToRegexp.ParseOptions) {
  return React.useMemo(() => new RouteLocation(parent.url, parent, options), [
    location,
    options
  ]);
}

/**
 * Compute nested URL for route.
 */
function nestedUrl(url: URL, index: number, { length }: string) {
  const { pathname, search, hash, href } = url;
  if (length === 0) return url; // No URL change.
  const newPathname = pathname.slice(0, index) + pathname.slice(index + length);
  const newPath = `${newPathname || "/"}${search}${hash}`;
  return new URL(newPath, href);
}

/**
 * Props for path matching.
 */
export interface RouteProps {
  path: pathToRegexp.Path;
  options?: Options;
  children: (
    params: Array<string | undefined>,
    location: RouteLocation
  ) => React.ReactNode;
}

/**
 * Simple path matching component.
 */
export function Route({ path, options, children }: RouteProps) {
  const location = React.useContext(Context);
  const route = useRoute(location, options);
  const re = usePath(path, options);
  const router = getRouter(location);

  // Use `state` to track route matches, avoids re-rendering on `false`.
  const [result, setResult] = React.useState<Result>(() =>
    router.match(re, location.url)
  );
  const update = (url: URL) => setResult(router.match(re, url));

  // Track router changes.
  React.useLayoutEffect(() => router.track(re, update), [router, re]);

  if (!result) return null;

  const { params, index, value } = result;

  // Update route URL with match.
  route.url = nestedUrl(location.url, index, value);

  return (
    <Context.Provider value={route}>{children(params, route)}</Context.Provider>
  );
}

/**
 * Unconditionally render a `<Match />` component.
 */
export interface MatchProps {
  path: pathToRegexp.Path;
  options?: Options;
  children: (match: Result, location: SimpleLocation) => React.ReactNode;
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
 * Redirection component properties.
 */
export interface RedirectProps {
  path: string;
  params?: object;
  options?: pathToRegexp.ParseOptions;
}

/**
 * Declarative redirect with `path-to-regexp`.
 */
export function Redirect({ path, options, params }: RedirectProps) {
  const fn = React.useMemo(() => pathToRegexp.compile(path, options), [
    path,
    options
  ]);
  return <LocationRedirect to={fn(params)} />;
}

/**
 * Match result.
 */
export type Result =
  | { value: string; index: number; params: Array<string | undefined> }
  | false;

/**
 * Transform a regexp result into a list of params.
 */
function toParams(m: RegExpExecArray) {
  const params: Array<string | undefined> = Array(m.length - 1);

  // Decode URL parameters for route.
  for (let i = 1; i < m.length; i++) {
    if ((m[i] as string | undefined) === undefined) continue;

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
function match(re: RegExp, url: URL): Result {
  const m = re.exec(url.pathname);
  if (!m) return false;

  const params = toParams(m);
  if (!params) return false;

  const value = m[0];
  const index = m.index;

  return { value, params, index };
}
