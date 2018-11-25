import pathToRegExp = require("path-to-regexp");
import * as React from "react";
import { Context, Route, SimpleLocation } from "@blakeembrey/react-location";

/**
 * Simple nested router support.
 */
export class NestedLocation extends SimpleLocation {
  constructor(public parent: SimpleLocation, public prefix: string, url: URL) {
    super(url);
  }

  push(location: string) {
    return this.parent.push(location);
  }
}

/**
 * Create a simple route function.
 */
export function route(
  path: pathToRegExp.Path,
  callback: (params: string[], url: URL) => React.ReactNode,
  options?: pathToRegExp.RegExpOptions
) {
  const re = pathToRegExp(path, undefined, options);

  return (
    <Route>
      {({ origin, pathname, search, hash }, location) => {
        const m = re.exec(pathname);

        if (!m) return false;

        const prefix = m[0];
        const params = m.slice(1);
        const nested =
          pathname.slice(0, m.index) + pathname.slice(m.index + prefix.length);
        const url = new URL(`${nested}${search}${hash}`, origin);

        return (
          <Context.Provider value={new NestedLocation(location, prefix, url)}>
            {callback(params, url)}
          </Context.Provider>
        );
      }}
    </Route>
  );
}
