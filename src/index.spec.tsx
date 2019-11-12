import * as React from "react";
import { render } from "react-dom";
import { Context, SimpleLocation, Link } from "@blakeembrey/react-location";
import { Route, Switch, usePath, useMatch } from "./index";

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
        <Route path="/foo">{(_, { url }) => <div>{url.pathname}</div>}</Route>
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
        <Route<{ id: string }> path="/blog/:id">
          {({ id }) => <div>{id}</div>}
        </Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("123");
  });

  it("should support optional params", () => {
    const location = new SimpleLocation(new URL("http://example.com/blog"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        <Route<{ id?: string }> path="/blog/:id?">
          {({ id }) => <div>{typeof id}</div>}
        </Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("undefined");
  });

  it("should prefix match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo/bar"));
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        <Route path="/foo" end={false}>
          {(_, { url }) => <div>{url.pathname}</div>}
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
        <Route path="/bar" start={false}>
          {(_, { url }) => <div>{url.pathname}</div>}
        </Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/foo");
  });

  it("should match unicode route", () => {
    const location = new SimpleLocation(
      new URL("http://example.com/caf%C3%A9/test")
    );
    const node = document.createElement("div");

    render(
      <Context.Provider value={location}>
        <Route path="/café" end={false}>
          {(_, { url }) => <div>{url.pathname}</div>}
        </Route>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/test");
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

  it("should compile paths", () => {
    const node = document.createElement("div");

    const App = () => {
      const path = usePath<{ id: string }>("/:id", { id: "123" });

      return <div>{path}</div>;
    };

    render(<App />, node);

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/123");
  });

  it("should encode path parameters", () => {
    const node = document.createElement("div");

    const App = () => {
      const path = usePath<{ id: string }>("/:id", { id: "café" });

      return <div>{path}</div>;
    };

    render(<App />, node);

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/caf%C3%A9");
  });

  describe("match", () => {
    const App = () => {
      const match = useMatch("/");

      return <div>{match ? "true" : "false"}</div>;
    };

    it("should render matches", () => {
      const node = document.createElement("div");

      render(<App />, node);

      expect(node.children.length).toBe(1);
      expect(node.children[0].textContent).toEqual("true");
    });

    it("should render non-matches", () => {
      const location = new SimpleLocation(new URL("http://example.com/page"));
      const node = document.createElement("div");

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(1);
      expect(node.children[0].textContent).toEqual("false");
    });
  });

  describe("switch", () => {
    const App = () => {
      return (
        <Switch>
          <Route path="/me">{() => <span>Blake</span>}</Route>
          <Route<{ id: string }> path="/:id">
            {({ id }) => <div>{id}</div>}
          </Route>
        </Switch>
      );
    };

    it("should render match", () => {
      const location = new SimpleLocation(new URL("http://example.com/123"));
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

    it("should match first match only", () => {
      const location = new SimpleLocation(new URL("http://example.com/me"));
      const node = document.createElement("div");

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(1);
      expect(node.children[0].nodeName).toEqual("SPAN");
      expect(node.children[0].textContent).toEqual("Blake");
    });

    it("should render nothing when no match", () => {
      const location = new SimpleLocation(new URL("http://example.com/x/y/z"));
      const node = document.createElement("div");

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(0);
    });

    it("should decode parameters", () => {
      const location = new SimpleLocation(
        new URL("http://example.com/caf%C3%A9")
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
      expect(node.children[0].textContent).toEqual("café");
    });
  });

  describe("nested routing", () => {
    const App = () => {
      return (
        <Switch>
          <Route path="/page" end={false}>
            {() => {
              return (
                <Switch>
                  <Route path="/">{() => <ul />}</Route>
                  <Route path="/me">{() => <Link to="/foo">Blake</Link>}</Route>
                  <Route<{ id: string }> path="/:id">
                    {({ id }) => <div>{id}</div>}
                  </Route>
                  <Route end={false}>
                    {(_, { fullUrl }) => <b>{fullUrl.pathname}</b>}
                  </Route>
                </Switch>
              );
            }}
          </Route>
          <Route path="" end={false}>
            {() => <div>Not Found</div>}
          </Route>
        </Switch>
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

    it("should render static route before id", () => {
      const location = new SimpleLocation(
        new URL("http://example.com/page/me")
      );
      const node = document.createElement("div");

      document.body.appendChild(node);

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(1);
      expect(node.children[0].nodeName).toEqual("A");
      expect(node.children[0].textContent).toEqual("Blake");

      (node.children[0] as HTMLAnchorElement).click();

      expect(node.children.length).toBe(1);
      expect(node.children[0].nodeName).toEqual("DIV");
      expect(node.children[0].textContent).toEqual("Not Found");

      document.body.removeChild(node);
    });

    it("should render not found route", () => {
      const location = new SimpleLocation(
        new URL("http://example.com/not/found")
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
      expect(node.children[0].textContent).toEqual("Not Found");
    });

    it("should render full url", () => {
      const location = new SimpleLocation(
        new URL("http://example.com/page/not/found")
      );
      const node = document.createElement("div");

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(1);
      expect(node.children[0].nodeName).toEqual("B");
      expect(node.children[0].textContent).toEqual("/page/not/found");
    });
  });
});
