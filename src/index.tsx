import * as pathToRegexp from "path-to-regexp";
import * as React from "react";
import { Context } from "@blakeembrey/react-location";

/**
 * Use context to communicate the route params.
 */
export interface Route<P extends object = object> {
  params: P;
  pathname: string;
}

/**
 * Internal context for nested route matching.
 */
export const RouteContext = React.createContext<Route | undefined>(undefined);

/**
 * Use pathname from context (or fallback on global URL).
 */
export const usePathname = () => {
  const location = React.useContext(Context);
  const [pathname, setPathname] = React.useState(location.url.pathname);
  React.useLayoutEffect(() =>
    location.onChange(() => setPathname(location.url.pathname))
  );
  const route = React.useContext(RouteContext);
  return route ? route.pathname : pathname;
};

/**
 * Options for `pathToRegexp.compile`.
 */
export interface CompileOptions {
  sensitive?: boolean;
}

/**
 * Create a compiled path function.
 */
export function useCompile<P extends object = object>(
  path: string,
  options: CompileOptions = {}
) {
  const { sensitive } = options;

  return React.useMemo(
    () =>
      pathToRegexp.compile<P>(path, {
        encode: encodeURIComponent,
        sensitive,
      }),
    [path, sensitive]
  );
}

/**
 * React hook for matching URLs.
 */
export function useMatch<P extends object = object>(
  path: string,
  options?: MatchOptions
) {
  const { sensitive, start, end, strict, encode, decode } = toMatchOptions(
    options
  );

  return React.useMemo(
    () =>
      pathToRegexp.match<P>(path, {
        sensitive,
        start,
        end,
        strict,
        encode,
        decode,
      }),
    [path, encode, decode, sensitive, start, end, strict]
  );
}

/**
 * Render a route.
 */
export type RouteComponent<P extends object> = React.ComponentType<{
  params: P;
}>;

/**
 * Standard options for `pathToRegexp.match`.
 */
export interface MatchOptions {
  sensitive?: boolean;
  start?: boolean;
  end?: boolean;
  strict?: boolean;
}

/**
 * Route props accept a path, options and a function to render on match.
 */
export interface RouteProps<P extends object> extends MatchOptions {
  path?: string;
  component: RouteComponent<P>;
}

/**
 * Extract `match` options from component props.
 */
function toMatchOptions(
  options: MatchOptions = {}
): pathToRegexp.TokensToRegexpOptions & pathToRegexp.RegexpToFunctionOptions {
  const { start, end, sensitive, strict } = options;

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
export function Route<P extends object = object>({
  path = "",
  start,
  end,
  sensitive,
  strict,
  component,
}: RouteProps<P>) {
  const pathname = usePathname();
  const match = useMatch<P>(path, { start, end, sensitive, strict });
  const result = React.useMemo(() => match(pathname), [match, pathname]);
  return result ? <ShowRoute component={component} result={result} /> : null;
}

/**
 * Render the body of a `<Route />` component.
 */
function ShowRoute<P extends object>(props: {
  component: RouteComponent<P>;
  result: pathToRegexp.MatchResult<P>;
}) {
  const { component: Component, result: match } = props;
  const pathname = usePathname();
  const { params, index, path } = match;
  const route = React.useMemo(
    () => ({
      pathname: nestedPathname(pathname, index, path),
      params,
    }),
    [pathname, index, path]
  );

  return (
    <RouteContext.Provider value={route}>
      <Component params={params} />
    </RouteContext.Provider>
  );
}

/**
 * Switch is a wrapper component for a list of `<Route />`.
 */
export interface SwitchProps {
  fallback?: React.ComponentType<{}>;
  children: Array<React.ReactElement<RouteProps<object>, typeof Route>>;
}

/**
 * Renders `null` as the default fallback when `<Switch />` does not match.
 */
export const FallbackComponent = () => null;

/**
 * Component for matching and rendering the first `<Route />` of children.
 */
export function Switch({
  children,
  fallback: Fallback = FallbackComponent,
}: SwitchProps) {
  const pathname = usePathname();

  const childRoutes = React.useMemo(
    () =>
      React.Children.map(children, (child) => {
        const { path, component } = child.props;
        const options = toMatchOptions(child.props);

        if (child.type === Route) {
          const match = pathToRegexp.match(path || "", options);
          return { component, match };
        }

        throw new TypeError("Expected `<Switch />` children to be `<Route />`");
      }),
    [children]
  );

  return React.useMemo(() => {
    for (const { match, component } of childRoutes) {
      const result = match(pathname);
      if (result) return <ShowRoute component={component} result={result} />;
    }

    return <Fallback />;
  }, [pathname, childRoutes]);
}

/**
 * Compute nested URL for route.
 */
function nestedPathname(pathname: string, index: number, { length }: string) {
  if (length === 0) return pathname; // No URL change.
  return pathname.slice(0, index) + pathname.slice(index + length) || "/";
}
