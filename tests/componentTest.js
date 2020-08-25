const { mount } = require("enzyme");
const { html } = require("htm/react");
const MyComponent = require("../src/MyComponent");

// make sure this is longer than the time requied for fetch to resolve
const delay = 2000;

describe("MyComponent", () => {
  it("renders", async () => {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const wrapper = mount(html`<${MyComponent} />`);
    expect(wrapper.text()).toEqual("Hello Stranger");
  });
});
