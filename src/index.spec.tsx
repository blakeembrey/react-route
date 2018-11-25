import * as React from "react";
import { render } from "react-dom";
import { Context, SimpleLocation, Link } from '@blakeembrey/react-location';
import { route } from "./index";

describe("react route", () => {
  it("should not match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/test"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        {route('/foo', () => <div>Hello world!</div>)}
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(0);
  });

  it("should match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        {route('/foo', (_, { pathname }) => <div>{pathname}</div>)}
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual('/');
  });

  it("should work with params", () => {
    const location = new SimpleLocation(new URL("http://example.com/blog/123"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        {route('/blog/:id', ([id]) => <div>{id}</div>)}
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual('123');
  });

  it("should prefix match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo/bar"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        {route('/foo', (_, { pathname }) => <div>{pathname}</div>, { end: false })}
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual('/bar');
  });

  it("should suffix match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo/bar"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        {route('/bar', (_, { pathname }) => <div>{pathname}</div>, { start: false })}
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual('/foo');
  });

  it("should support nested links", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo"));
    const node = document.createElement("div");

    document.body.appendChild(node);

    render(
      <Context.Provider value={location}>
        {route('/foo', () => <Link to="/test">Click here</Link>)}
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual('Click here');

    ;(node.children[0] as HTMLAnchorElement).click();

    expect(node.children.length).toBe(0);

    document.body.removeChild(node);
  });
});
