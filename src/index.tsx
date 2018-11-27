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
  constructor(
    url: URL,
    public parent: SimpleLocation,
    public options: Options = {}
  ) {
    super(url);
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
  path: string;
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
  const re = React.useMemo(() => pathToRegexp(path, undefined, options), [
    path,
    options
  ]);

  return (
    <Router>
      {(url, location) => {
        const m = re.exec(url.pathname);

        if (!m) return null;

        const match = m[0];
        const newPathname =
          url.pathname.slice(0, m.index) +
          url.pathname.slice(m.index + match.length);
        const newPath = `${newPathname || "/"}${url.search}${url.hash}`;
        const newUrl = new URL(newPath, url.href);
        const newLocation = new RouteLocation(newUrl, location, options);
        const params: string[] = Array(match.length - 1);

        // Decode URL parameters for route.
        for (let i = 1; i < match.length; i++) {
          try {
            params[i - 1] = decodeURIComponent(m[i]);
          } catch (e) {
            return null; // Bail from router on bad URL.
          }
        }

        return (
          <Context.Provider value={newLocation}>
            {children(params, newUrl, newLocation)}
          </Context.Provider>
        );
      }}
    </Router>
  );
}
