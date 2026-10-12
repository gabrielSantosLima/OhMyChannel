class SystemBrowser {
  constructor({ openExternal }) {
    this.openExternal = openExternal;
  }

  open(url) {
    return this.openExternal(url);
  }
}

module.exports = { SystemBrowser };
