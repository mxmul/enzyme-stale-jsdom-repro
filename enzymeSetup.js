const enzyme = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");
const reactDOM = require("react-dom");

const nodes = [];

class ReactAdapterWithMountTracking extends Adapter {
  createRenderer(options) {
    let node;
    if (options.mode === enzyme.EnzymeAdapter.MODES.MOUNT) {
      node = options.attachTo || global.document.createElement("div");
      nodes.push(node);
    }

    return super.createRenderer.call(this, { ...options, attachTo: node });
  }
}

afterEach(() => {
  nodes.forEach((node) => {
    reactDOM.unmountComponentAtNode(node);
  });
});

enzyme.configure({ adapter: new ReactAdapterWithMountTracking() });
