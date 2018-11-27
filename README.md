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
import { Route } from "@blakeembrey/react-route";

const App = () => {
  return (
    <div>
      <Route path="/page">{() => <ul />}</Route>
      <Route path="/page/:id">{([id]) => <div>{id}</div>}</Route>
      {/* Also supports nested routing with `path-to-regexp` options. */}
      <Route path="/page" options={{ end: false }}>
        {() => {
          return (
            <>
              <Route path="/">{() => <ul />}</Route>
              <Route path="/:id">{([id]) => <div>{id}</div>}</Route>
            </>
          );
        }}
      </Route>
    </div>
  );
};
```

**Tip:** Every `<Route />` shares a cache based on the `Location` context from `react-location`. Why? This enables only the first route to be matched against the URL. Any other route will be ignored, enabled "not found" routes.

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
