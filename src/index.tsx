import * as pathToRegexp from "path-to-regexp";
import * as React from "react";
import {
  Context,
  SimpleLocation,
  useRouter,
} from "@blakeembrey/react-location";

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
 * Create a compiled path function.
 */
export function usePathCompile<P extends object = object>(
  path: string,
  options?: pathToRegexp.ParseOptions & pathToRegexp.TokensToFunctionOptions
) {
  return React.useMemo(
    () =>
      pathToRegexp.compile<P>(path, {
        encode: encodeURIComponent,
        ...options,
      }),
    [path, options]
  );
}

/**
 * React hook for matching URLs.
 */
export function usePathMatch<P extends object = object>(
  path: string,
  options?: pathToRegexp.ParseOptions & pathToRegexp.TokensToRegexpOptions
) {
  return React.useMemo(
    () =>
      pathToRegexp.match<P>(path, {
        encode: encodeURI,
        decode: decodeURIComponent,
        ...options,
      }),
    [path, options]
  );
}

/**
 * Create a path from a `path-to-regexp` path and params.
 */
export function usePath<P extends object = object>(
  path: string,
  params?: P,
  options?: pathToRegexp.ParseOptions & pathToRegexp.TokensToRegexpOptions
) {
  const fn = usePathCompile<P>(path, options);
  return React.useMemo(() => fn(params), [fn, params]);
}

/**
 * Get match from the current URL.
 */
export function useMatch<P extends object = object>(
  path: string,
  options?: pathToRegexp.ParseOptions &
    pathToRegexp.TokensToRegexpOptions &
    pathToRegexp.RegexpToFunctionOptions
) {
  const [url] = useRouter();
  const fn = usePathMatch<P>(path, options);
  return React.useMemo(() => fn(url.pathname), [fn, url.pathname]);
}

export type RouteChildren<P extends object> = (
  params: P,
  location: RouteLocation
) => React.ReactNode;

/**
 * Route props accept a path, options and a function to render on match.
 */
export interface RouteProps<P extends object> {
  path?: string;
  sensitive?: boolean;
  start?: boolean;
  end?: boolean;
  strict?: boolean;
  children: RouteChildren<P>;
}

/**
 * Extract `match` options from component props.
 */
function toMatchOptions(
  props: RouteProps<any>
): pathToRegexp.TokensToRegexpOptions & pathToRegexp.RegexpToFunctionOptions {
  const { start, end, sensitive, strict } = props;

  return {
    start,
    end,
    sensitive,
    strict,
    encode: encodeURI,
    decode: decodeURIComponent,
  };
}

/**
 * Conditionally renders `children` when the path matches the active URL.
 */
export function Route<P extends object = object>(props: RouteProps<P>) {
  const match = useMatch<P>(props.path || "", toMatchOptions(props));
  return match ? <ShowRoute children={props.children} match={match} /> : null;
}

/**
 * Render the body of a `<Route />` component.
 */
function ShowRoute<P extends object>(props: {
  children: RouteChildren<P>;
  match: pathToRegexp.MatchResult<P>;
}) {
  const location = React.useContext(Context);
  const { params, index, path } = props.match;
  const url = nestedUrl(location.url, index, path);
  const route = new RouteLocation(url, location);

  React.useLayoutEffect(
    () =>
      location.onChange(() => {
        // Update nested route when parent changes (e.g. hash or search).
        route.url = nestedUrl(location.url, index, path);
      }),
    [location]
  );

  return (
    <Context.Provider value={route}>
      {props.children(params, route)}
    </Context.Provider>
  );
}

/**
 * Switch is a wrapper component for a list of `<Route />`.
 */
export interface SwitchProps {
  children: Array<React.ReactElement<RouteProps<object>, typeof Route>>;
}

/**
 * Component for matching and rendering the first `<Route />` of children.
 */
export function Switch({ children }: SwitchProps) {
  const [url, location] = useRouter();

  const childRoutes = React.useMemo(
    () =>
      React.Children.map(children, (child) => {
        const { path, children: fn } = child.props;
        const options = toMatchOptions(child.props);

        if (child.type === Route) {
          const match = pathToRegexp.match(path || "", options);
          return { fn, match };
        }

        throw new TypeError("Expected `<Switch />` children to be `<Route />`");
      }),
    [children]
  );

  const [child, match] = React.useMemo<
    [RouteChildren<any> | null, pathToRegexp.Match]
  >(() => {
    for (const { match, fn } of childRoutes) {
      const result = match(url.pathname);
      if (result) return [fn, result];
    }

    return [null, false];
  }, [url.pathname, location, childRoutes]);

  return child && match ? <ShowRoute children={child} match={match} /> : null;
}

/**
 * Compute nested URL for route.
 */
function nestedUrl(url: URL, index: number, { length }: string) {
  if (length === 0) return url; // No URL change.
  const { pathname, search, hash, origin } = url;
  const newPathname = pathname.slice(0, index) + pathname.slice(index + length);
  return new URL(`${origin}${newPathname || "/"}${search}${hash}`);
}
