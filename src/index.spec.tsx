import * as React from "react";
import { render } from "react-dom";
import { Context, SimpleLocation, Link } from "@blakeembrey/react-location";
import { Route } from "./index";

describe("react route", () => {
  it("should not match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/test"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        <Route path="/foo">{() => <div>Hello world!</div>}</Route>
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
        <Route path="/foo">{(_, { pathname }) => <div>{pathname}</div>}</Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/");
  });

  it("should render with params", () => {
    const location = new SimpleLocation(new URL("http://example.com/blog/123"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        <Route path="/blog/:id">{([id]) => <div>{id}</div>}</Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("123");
  });

  it("should prefix match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo/bar"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        <Route path="/foo" options={{ end: false }}>
          {(_, { pathname }) => <div>{pathname}</div>}
        </Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/bar");
  });

  it("should suffix match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo/bar"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        <Route path="/bar" options={{ start: false }}>
          {(_, { pathname }) => <div>{pathname}</div>}
        </Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/foo");
  });

  it("should support links", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo"));
    const node = document.createElement("div");

    document.body.appendChild(node);

    render(
      <Context.Provider value={location}>
        <Route path="/foo">{() => <Link to="/test">Click here</Link>}</Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("Click here");

    (node.children[0] as HTMLAnchorElement).click();

    expect(node.children.length).toBe(0);

    document.body.removeChild(node);
  });

  describe("nested routing", () => {
    const App = () => {
      return (
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
      );
    };

    it("should render page route", () => {
      const location = new SimpleLocation(new URL("http://example.com/page"));
      const node = document.createElement("div");

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(1);
      expect(node.children[0].nodeName).toEqual("UL");
      expect(node.children[0].textContent).toEqual("");
    });

    it("should render child route", () => {
      const location = new SimpleLocation(
        new URL("http://example.com/page/123")
      );
      const node = document.createElement("div");

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(1);
      expect(node.children[0].nodeName).toEqual("DIV");
      expect(node.children[0].textContent).toEqual("123");
    });
  });
});
