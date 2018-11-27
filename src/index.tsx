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

        const params = toParams(m);
        if (!params) return null;

        const value = m[0];
        const newPathname =
          url.pathname.slice(0, m.index) +
          url.pathname.slice(m.index + value.length);
        const newPath = `${newPathname || "/"}${url.search}${url.hash}`;
        const newUrl = new URL(newPath, url.href);
        const newLocation = new RouteLocation(newUrl, location, options);

        return (
          <Context.Provider value={newLocation}>
            {children(params, newUrl, newLocation)}
          </Context.Provider>
        );
      }}
    </Router>
  );
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
