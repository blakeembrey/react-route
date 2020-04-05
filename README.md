# React Route

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> [Path-to-RegExp](https://github.com/pillarjs/path-to-regexp) with [React Location](https://github.com/blakeembrey/react-location).

## Installation

```
npm install @blakeembrey/react-route --save
```

## Usage

Use with [React Location](https://github.com/blakeembrey/react-location).

```js
import {
  Route,
  Switch,
  useRoutePath,
  useMatch,
  usePathMatch,
  usePathCompile,
} from "@blakeembrey/react-route";
```

### `Route`

Conditionally renders `component` when the path matches the active URL.

```js
const App = () => {
  return (
    <Route
      path="/page/:id"
      component={(params) => <div>{JSON.stringify(params)}</div>}
    />
  );
}; // `/123` => `<div>["123"]</div>`
```

Supports `path-to-regexp` properties:

- **sensitive** When `true`, the regexp will be case sensitive. (default: `false`)
- **strict** When `true`, optional trailing delimiters will not match. (default: `false`)
- **end** When `true`, the regexp will match to the end of the string. (default: `true`)
- **start** When `true`, the regexp will match to the beginning of the string. (default: `true`)

### `Switch`

Component for matching and rendering the first `<Route />` of children.

```js
const App = () => {
  return (
    <Switch fallback={...}>
      <Route path="/me" component={() => <span>Blake</span>} />
      <Route path="/:id" component={({ id }) => <div>{id}</div>} />
      <Route end={false} component={() => <div>404 Not Found</div>} />
    </Switch>
  );
}; // `/me` => `<span>Blake</span>`
```

### `useRoutePath`

Returns the current pathname based on the router (e.g. route prefixes are removed).

```js
useRoutePath(); //=> "/foo"
```

### `useMatch`

Create a `path-to-regexp` match function and run it on the current path.

```js
const App = () => {
  const result = useMatch("/test");

  return <div>{JSON.stringify(result)}</div>;
}; //=> `<div>{"params":[],"index":0,"path":"/test"}</div>`
```

### `usePathMatch`

Create a `path-to-regexp` match function.

```js
const App = () => {
  const match = usePathMatch("/test");

  return <div>{JSON.stringify(match("/"))}</div>;
}; //=> `<div>false</div>`
```

### `usePathCompile`

Creates a `path-to-regexp` path function.

```js
const App = () => {
  const path = usePathCompile("/:id")({ id: 123 });

  return <Link to={path}>User {id}</Link>;
};
```

## TypeScript

This project uses [TypeScript](https://github.com/Microsoft/TypeScript) and publishes definitions on NPM.

## License

Apache 2.0

[npm-image]: https://img.shields.io/npm/v/@blakeembrey/react-route.svg?style=flat
[npm-url]: https://npmjs.org/package/@blakeembrey/react-route
[downloads-image]: https://img.shields.io/npm/dm/@blakeembrey/react-route.svg?style=flat
[downloads-url]: https://npmjs.org/package/@blakeembrey/react-route
[travis-image]: https://img.shields.io/travis/blakeembrey/react-route.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/react-route
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/react-route.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/react-route?branch=master
