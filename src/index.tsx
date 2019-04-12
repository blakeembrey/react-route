import pathToRegexp = require("path-to-regexp");
import * as React from "react";
import { Context, SimpleLocation, Router } from "@blakeembrey/react-location";

/**
 * Path matching options.
 */
export type Options = pathToRegexp.RegExpOptions & pathToRegexp.ParseOptions;

/**
 * Simple nested router support.
 */
export class RouteLocation extends SimpleLocation {
  constructor(url: URL, public parent: SimpleLocation) {
    super(url);
  }

  get fullUrl(): URL {
    if (this.parent instanceof RouteLocation) return this.parent.fullUrl;
    return this.parent.url;
  }

  push(location: string) {
    return this.parent.push(location);
  }

  format(location: string) {
    return this.parent.format(location);
  }
}

/**
 * Create a path from a `path-to-regexp` path and params.
 */
export function usePath(
  path: string,
  params?: object,
  options?: pathToRegexp.ParseOptions
) {
  const fn = React.useMemo(() => pathToRegexp.compile(path, options), [
    path,
    options
  ]);
  return React.useMemo(() => fn(params), [params]);
}

/**
 * Create a `path-to-regexp` result from path + options.
 */
export function usePathToRegexp(path: pathToRegexp.Path, options?: Options) {
  return React.useMemo(() => pathToRegexp(path, undefined, options), [
    path,
    options
  ]);
}

/**
 * Match props accept path, options and a child function to render.
 */
export interface MatchProps {
  path: pathToRegexp.Path;
  options?: Options;
  children: (match: Result, location: SimpleLocation) => React.ReactNode;
}

/**
 * Unconditionally renders `children` with the match result of the active URL.
 */
export function Match({ path, options, children }: MatchProps) {
  const re = usePathToRegexp(path, options);

  return (
    <Router>{(url, location) => children(match(re, url), location)}</Router>
  );
}

/**
 * Matching route function.
 */
export type RouteFunction = (
  params: Array<string | undefined>,
  location: RouteLocation
) => React.ReactNode;

/**
 * Route props accept a path, options and a function to render on match.
 */
export interface RouteProps {
  path: pathToRegexp.Path;
  options?: Options;
  children: RouteFunction;
}

/**
 * Conditionally renders `children` when the path matches the active URL.
 */
export function Route({ path, options, children }: RouteProps) {
  return (
    <Match path={path} options={options}>
      {(result, location) => {
        return result ? renderRoute(children, result, location) : null;
      }}
    </Match>
  );
}

/**
 * Use route props accept an optional path, options and function to render.
 */
export interface UseRouteProps {
  path?: string;
  options?: Options;
  children: RouteFunction;
}

/**
 * Pre-populated `<Route />` with `end=false` for prefix matching (if you don't
 * define the `path`, it'll match everything). A la Express.js routers.
 */
export function UseRoute({ path, options, children }: UseRouteProps) {
  const routeOptions = React.useMemo(() => ({ end: false, ...options }), [
    options
  ]);

  return <Route path={path || ""} options={routeOptions} children={children} />;
}

/**
 * Render the body of a `<Route />` component.
 */
function renderRoute(
  fn: RouteFunction,
  result: Exclude<Result, false>,
  location: SimpleLocation
) {
  const { params, index, value } = result;
  const url = nestedUrl(location.url, index, value);
  const route = new RouteLocation(url, location);

  return <Context.Provider value={route}>{fn(params, route)}</Context.Provider>;
}

/**
 * Switch is a wrapper component for a list of `<Route />`.
 */
export interface SwitchProps {
  children: Array<React.ReactElement<RouteProps, typeof Route>>;
}

/**
 * Component for matching and rendering the first `<Route />` of children.
 */
export function Switch({ children }: SwitchProps) {
  const childRoutes = React.useMemo(
    () =>
      React.Children.map(children, child => {
        const { path, options, children: fn } = child.props;

        if (child.type === Route) {
          const re = pathToRegexp(path, undefined, options);
          return { fn, re };
        }

        if (child.type === UseRoute) {
          const re = pathToRegexp(path || "", undefined, {
            end: false,
            ...options
          });

          return { fn, re };
        }

        throw new TypeError("Expected `<Switch />` children to be `<Route />`");
      }),
    [children]
  );

  return (
    <Router>
      {(url, location) => {
        for (const { fn, re } of childRoutes) {
          const result = match(re, url);
          if (result) return renderRoute(fn, result, location);
        }

        return null;
      }}
    </Router>
  );
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
