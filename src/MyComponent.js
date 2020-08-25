const React = require("react");
const { html } = require("htm/react");

require("cross-fetch/polyfill");

module.exports = function LeakyComponent() {
  const [name, setName] = React.useState("Stranger");

  React.useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetch("https://swapi.dev/api/people/1/", { signal })
      .then((resp) => resp.json())
      .then((data) => {
        setName(data.name);
      });

    return () => controller.abort();
  }, []);

  return html`<p>Hello ${name}</p>`;
};
