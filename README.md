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
import { Route, Switch, useMatch, usePath } from "@blakeembrey/react-route";
```

### `Route`

Conditionally renders `children` when the path matches the active URL.

```js
const App = () => {
  return (
    <Route path="/page/:id">
      {(params, location) => <div>{JSON.stringify(params)}</div>}
    </Route>
  );
}; // `/123` => `<div>["123"]</div>`
```

Supports `path-to-regexp` options as props:

- **sensitive** When `true`, the regexp will be case sensitive. (default: `false`)
- **strict** When `true`, optional trailing delimiters will not match. (default: `false`)
- **end** When `true`, the regexp will match to the end of the string. (default: `true`)
- **start** When `true`, the regexp will match to the beginning of the string. (default: `true`)

### `Switch`

Component for matching and rendering the first `<Route />` of children.

```js
const App = () => {
  return (
    <Switch>
      <Route path="/me">{() => <span>Blake</span>}</Route>
      <Route path="/:id">{([id]) => <div>{id}</div>}</Route>
      <Route end={false}>{() => <div>404 Not Found</div>}</Route>
    </Switch>
  );
}; // `/me` => `<span>Blake</span>`
```

### `useMatch`

Returns the match of the currently active URL.

```js
const App = () => {
  const match = useMatch("/test");

  return <div>{JSON.stringify(result)}</div>;
}; // `/test` => `<div>{"params":[],"index":0,"path":"/test"}</div>`
```

### `usePath`

Creates a path from a `path-to-regexp` path and params.

```js
const App = () => {
  const path = usePath("/:id", { id: 123 });

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
