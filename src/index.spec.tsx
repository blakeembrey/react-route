import * as React from "react";
import { render } from "react-dom";
import { act } from "react-dom/test-utils";
import {
  Context,
  SimpleLocation,
  Link,
  useRouter,
} from "@blakeembrey/react-location";
import { Route, Switch, useCompile, useMatch, usePathname } from "./index";

describe("react route", () => {
  let node: HTMLDivElement;

  beforeEach(() => {
    node = document.createElement("div");
    document.body.appendChild(node);
  });

  afterEach(() => {
    document.body.removeChild(node);
  });

  it("should not match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/test"));

    render(
      <Context.Provider value={location}>
        <Route path="/foo" component={() => <div>Hello world!</div>} />
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(0);
  });

  it("should match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo"));

    render(
      <Context.Provider value={location}>
        <Route path="/foo" component={() => <div>{usePathname()}</div>} />
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/");
  });

  it("should render with params", () => {
    const location = new SimpleLocation(new URL("http://example.com/blog/123"));

    render(
      <Context.Provider value={location}>
        <Route<{ id: string }>
          path="/blog/:id"
          component={({ params: { id } }) => <div>{id}</div>}
        />
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("123");
  });

  it("should support optional params", () => {
    const location = new SimpleLocation(new URL("http://example.com/blog"));

    render(
      <Context.Provider value={location}>
        <Route<{ id?: string }>
          path="/blog/:id?"
          component={({ params: { id } }) => <div>{typeof id}</div>}
        />
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("undefined");
  });

  it("should prefix match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo/bar"));

    render(
      <Context.Provider value={location}>
        <Route
          path="/foo"
          end={false}
          component={() => <div>{usePathname()}</div>}
        />
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/bar");
  });

  it("should suffix match route", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo/bar"));

    render(
      <Context.Provider value={location}>
        <Route
          path="/bar"
          start={false}
          component={() => <div>{usePathname()}</div>}
        />
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

    render(
      <Context.Provider value={location}>
        <Route
          path="/café"
          end={false}
          component={() => <div>{usePathname()}</div>}
        />
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/test");
  });

  it("should support links", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo"));

    render(
      <Context.Provider value={location}>
        <Route
          path="/foo"
          component={() => <Link to="/test">Click here</Link>}
        />
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("Click here");

    (node.children[0] as HTMLAnchorElement).click();

    expect(node.children.length).toBe(0);
  });

  it("should render route on change", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo"));
    let renderCount = 0;

    render(
      <Context.Provider value={location}>
        <Route
          path="/foo"
          component={() => {
            renderCount++;

            return <div />;
          }}
        />
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(renderCount).toBe(1);

    act(() => location.push("/foo?x=y"));

    expect(node.children.length).toBe(1);
    expect(renderCount).toBe(1);
  });

  it("should render switch route on change", () => {
    const location = new SimpleLocation(new URL("http://example.com/foo"));
    let renderCount = 0;

    render(
      <Context.Provider value={location}>
        <Switch>
          <Route
            path="/foo"
            component={() => {
              renderCount++;

              return <div />;
            }}
          />
          <Route end={false} component={() => <div />} />
        </Switch>
      </Context.Provider>,
      node
    );

    expect(node.children.length).toBe(1);
    expect(renderCount).toBe(1);

    act(() => location.push("/foo?x=y"));

    expect(node.children.length).toBe(1);
    expect(renderCount).toBe(1);
  });

  it("should compile paths", () => {
    const App = () => {
      const path = useCompile<{ id: string }>("/:id")({ id: "123" });

      return <div>{path}</div>;
    };

    render(<App />, node);

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/123");
  });

  it("should encode path parameters", () => {
    const App = () => {
      const path = useCompile<{ id: string }>("/:id")({ id: "café" });

      return <div>{path}</div>;
    };

    render(<App />, node);

    expect(node.children.length).toBe(1);
    expect(node.children[0].textContent).toEqual("/caf%C3%A9");
  });

  describe("match", () => {
    const App = () => {
      const match = useMatch("/");
      const pathname = usePathname();

      return <div>{match(pathname) ? "true" : "false"}</div>;
    };

    it("should render matches", () => {
      const location = new SimpleLocation(new URL("http://example.com"));

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(1);
      expect(node.children[0].textContent).toEqual("true");

      act(() => location.push("/foo"));

      expect(node.children.length).toBe(1);
      expect(node.children[0].textContent).toEqual("false");
    });
  });

  describe("switch", () => {
    const App = () => {
      return (
        <Switch>
          <Route path="/me" component={() => <span>Blake</span>} />
          <Route
            path="/echo"
            component={() => {
              const [url] = useRouter();
              return <span>{url.href}</span>;
            }}
          />
          <Route<{ id: string }>
            path="/:id"
            component={({ params: { id } }) => <div>{id}</div>}
          />
        </Switch>
      );
    };

    it("should render match", () => {
      const location = new SimpleLocation(new URL("http://example.com/123"));

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

    it("should update child routers on change", () => {
      const location = new SimpleLocation(new URL("http://example.com/echo"));

      render(
        <Context.Provider value={location}>
          <App />
        </Context.Provider>,
        node
      );

      expect(node.children.length).toBe(1);
      expect(node.children[0].nodeName).toEqual("SPAN");
      expect(node.children[0].textContent).toEqual("http://example.com/echo");

      act(() => location.push("#test"));
      expect(node.children.length).toBe(1);
      expect(node.children[0].textContent).toEqual(
        "http://example.com/echo#test"
      );

      act(() => location.push("?test=true"));
      expect(node.children.length).toBe(1);
      expect(node.children[0].textContent).toEqual(
        "http://example.com/echo?test=true"
      );

      act(() => location.push("/me"));
      expect(node.children.length).toBe(1);
      expect(node.children[0].textContent).toEqual("Blake");

      act(() => location.push("/foobar"));
      expect(node.children.length).toBe(1);
      expect(node.children[0].textContent).toEqual("foobar");
    });

    it("should render first match only", () => {
      const location = new SimpleLocation(new URL("http://example.com/me"));

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
          <Route
            path="/page"
            end={false}
            component={() => {
              return (
                <Switch>
                  <Route path="/" component={() => <ul />} />
                  <Route
                    path="/me"
                    component={() => <Link to="/foo">Blake</Link>}
                  />
                  <Route<{ id: string }>
                    path="/:id"
                    component={({ params: { id } }) => <div>{id}</div>}
                  />
                  <Route
                    end={false}
                    component={() => (
                      <b>{React.useContext(Context).url.pathname}</b>
                    )}
                  />
                </Switch>
              );
            }}
          />
          <Route path="" end={false} component={() => <div>Not Found</div>} />
        </Switch>
      );
    };

    it("should render page route", () => {
      const location = new SimpleLocation(new URL("http://example.com/page"));

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
    });

    it("should render not found route", () => {
      const location = new SimpleLocation(
        new URL("http://example.com/not/found")
      );

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
