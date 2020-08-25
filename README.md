```
$ yarn test

    TypeError: Cannot read property 'body' of null

      11 |       .then((resp) => resp.json())
      12 |       .then((data) => {
    > 13 |         setName(data.name);
         |       ^
      14 |       });
      15 |   }, []);
      16 |

      at getActiveElement (node_modules/react-dom/cjs/react-dom.development.js:6651:16)
      at getActiveElementDeep (node_modules/react-dom/cjs/react-dom.development.js:6939:17)
      at getSelectionInformation (node_modules/react-dom/cjs/react-dom.development.js:6972:21)
      at prepareForCommit (node_modules/react-dom/cjs/react-dom.development.js:7463:26)
      at commitRootImpl (node_modules/react-dom/cjs/react-dom.development.js:22474:5)
      at unstable_runWithPriority (node_modules/scheduler/cjs/scheduler.development.js:653:12)
      at runWithPriority$1 (node_modules/react-dom/cjs/react-dom.development.js:11039:10)
      at commitRoot (node_modules/react-dom/cjs/react-dom.development.js:22381:3)
      at finishSyncRender (node_modules/react-dom/cjs/react-dom.development.js:21807:3)
      at performSyncWorkOnRoot (node_modules/react-dom/cjs/react-dom.development.js:21793:7)
      at node_modules/react-dom/cjs/react-dom.development.js:11089:24
      at unstable_runWithPriority (node_modules/scheduler/cjs/scheduler.development.js:653:12)
      at runWithPriority$1 (node_modules/react-dom/cjs/react-dom.development.js:11039:10)
      at flushSyncCallbackQueueImpl (node_modules/react-dom/cjs/react-dom.development.js:11084:7)
      at flushSyncCallbackQueue (node_modules/react-dom/cjs/react-dom.development.js:11072:3)
      at scheduleUpdateOnFiber (node_modules/react-dom/cjs/react-dom.development.js:21199:9)
      at dispatchAction (node_modules/react-dom/cjs/react-dom.development.js:15660:5)
      at src/LeakyComponent.js:13:7
```

## What's going on here?

The React component under test triggers a `fetch` when mounted, which updates local state based on the response data.

Our test mounts the component in Enzyme, kicking off the `fetch`. But by the time the `fetch` is resolved, our test has already passed and the next test is being run. Between tests, Jest has torn down the intial jsdom environment and `document` is undefined. This causes ReactDOM to crash.

## What are we doing wrong?

Using a `fetch` polyfill in tests is a little weird, but let's say we do actually want to make the network call as an integration test. How can we prevent this annoying test pollution?

First of all, let's have `MyComponent` cancel any promises when it's umounted, [as recommended by the React blog](https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html). We can make our `fetch` cancellable by using an [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController):

```diff
   React.useEffect(() => {
-    fetch("https://swapi.dev/api/people/1/")
+    const controller = new AbortController();
+    const signal = controller.signal;
+
+    fetch("https://swapi.dev/api/people/1/", { signal })
       .then((resp) => resp.json())
       .then((data) => {
         setName(data.name);
       });
+
+    return () => controller.abort();
   }, []);
```

This is a lot nicer! When our component unmounts, the `fetch` request gets cancelled. But our tests still fail :()

It turns out that [Enzyme doesn't actually unmount your components](https://github.com/enzymejs/enzyme/issues/911) after each test suite, so they never even get an opportunity to abort the `fetch`. We can work around this by configuring a custom Enzyme adapter that keeps track of all mounted React components, and manually unmounting them in an `afterEach`:

```diff
 const enzyme = require("enzyme");
 const Adapter = require("enzyme-adapter-react-16");
+const reactDOM = require("react-dom");

-enzyme.configure({ adapter: new Adapter() });
+const nodes = [];
+
+class ReactAdapterWithMountTracking extends Adapter {
+  createRenderer(options) {
+    let node;
+    if (options.mode === enzyme.EnzymeAdapter.MODES.MOUNT) {
+      node = options.attachTo || global.document.createElement("div");
+      nodes.push(node);
+    }
+
+    return super.createRenderer.call(this, { ...options, attachTo: node });
+  }
+}
+
+afterEach(() => {
+  nodes.forEach((node) => {
+    reactDOM.unmountComponentAtNode(node);
+  });
+});
+
+enzyme.configure({ adapter: new ReactAdapterWithMountTracking() });
```

Now our tests both pass! But we still have some scary `UnhandledPromiseRejection` warnings:

```
(node:77771) UnhandledPromiseRejectionWarning: AbortError: The user aborted a request
```

Let's handle those by adding a `.catch()` handler to our `fetch`:

```diff
       .then((data) => {
         setName(data.name);
-      });
+      })
+      .catch(console.log);
```

🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 Tests all pass with no warnings!

_Check out https://github.com/mxmul/enzyme-stale-jsdom-repro/tree/master to see this repo with all fixes applied_
