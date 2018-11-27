import pathToRegExp = require("path-to-regexp");
import * as React from "react";
import { Context, Router, SimpleLocation } from "@blakeembrey/react-location";

/**
 * Simple nested router support.
 */
export class NestedLocation extends SimpleLocation {
  constructor(public parent: SimpleLocation, public match: string, url: URL) {
    super(url);
  }

  push(location: string) {
    return this.parent.push(location);
  }
}

/**
 * Props for path matching.
 */
export interface RouteProps {
  path: pathToRegExp.Path;
  options?: pathToRegExp.RegExpOptions;
  children: (
    params: string[],
    url: URL,
    location: NestedLocation
  ) => React.ReactNode;
}

/**
 * Simple path matching component.
 */
export function Route({ path, options, children }: RouteProps) {
  const re = React.useMemo(() => pathToRegExp(path, undefined, options), [
    path,
    options
  ]);

  return (
    <Router>
      {(url, location) => {
        const m = re.exec(url.pathname);

        if (!m) return false;

        const match = m[0];
        const nestedPathname =
          url.pathname.slice(0, m.index) +
          url.pathname.slice(m.index + match.length);
        const nestedUrl = new URL(
          `${nestedPathname || "/"}${url.search}${url.hash}`,
          url.href
        );
        const nestedLocation = new NestedLocation(location, match, nestedUrl);
        const params: string[] = Array(match.length - 1);

        // Decode URL parameters for route.
        for (let i = 1; i < match.length; i++) {
          try {
            params[i - 1] = decodeURIComponent(m[i]);
          } catch (e) {
            return false; // Bail from router on bad URL.
          }
        }

        return (
          <Context.Provider value={nestedLocation}>
            {children(params, nestedUrl, nestedLocation)}
          </Context.Provider>
        );
      }}
    </Router>
  );
}
