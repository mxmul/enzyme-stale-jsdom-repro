const React = require("react");
const { html } = require("htm/react");

require("cross-fetch/polyfill");

module.exports = function LeakyComponent() {
  const [name, setName] = React.useState("Stranger");

  React.useEffect(() => {
    fetch("https://swapi.dev/api/people/1/")
      .then((resp) => resp.json())
      .then((data) => {
        setName(data.name);
      });
  }, []);

  return html`<p>Hello ${name}</p>`;
};
