import * as pathToRegexp from "path-to-regexp";
import * as React from "react";
import { Context } from "@blakeembrey/react-location";

/**
 * Internal context for nested route matching.
 */
const RouteContext = React.createContext<
  | {
      pathname: string;
    }
  | undefined
>(undefined);

/**
 * Use pathname from context (or fallback on global URL).
 */
export const usePathname = () => {
  const location = React.useContext(Context);
  const [pathname, setPathname] = React.useState(location.url.pathname);
  React.useLayoutEffect(() => {
    return location.onChange(() => setPathname(location.url.pathname));
  });
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
 * Standard options for `pathToRegexp.match`.
 */
export interface MatchOptions {
  sensitive?: boolean;
  start?: boolean;
  end?: boolean;
  strict?: boolean;
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
export function Route<P extends object = object>(props: RouteProps<P>) {
  const pathname = usePathname();
  const match = useMatch<P>(props.path || "", props);
  const result = React.useMemo(() => match(pathname), [match, pathname]);
  return result ? <Output component={props.component} result={result} /> : null;
}

/**
 * Render the body of a `<Route />` component.
 */
function Output<P extends object>(props: {
  component: RouteComponent<P>;
  result: pathToRegexp.MatchResult<P>;
}) {
  const {
    component: Component,
    result: { params, index, path },
  } = props;
  const pathname = usePathname();
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
 * Component for matching and rendering the first `<Route />` of children.
 */
export function Switch({ children, fallback: Fallback }: SwitchProps) {
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
      if (result) return <Output component={component} result={result} />;
    }

    return Fallback ? <Fallback /> : null;
  }, [pathname, childRoutes]);
}

/**
 * Compute nested URL for route.
 */
function nestedPathname(pathname: string, index: number, { length }: string) {
  if (length === 0) return pathname; // No URL change.
  return pathname.slice(0, index) + pathname.slice(index + length) || "/";
}
