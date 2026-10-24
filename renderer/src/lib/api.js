export const api = window.api;

export function t(key, params) {
  return window.i18n ? window.i18n.t(key, params) : key;
}

export function assetUrl(fileName) {
  return "./" + String(fileName || "icon.png");
}

export function channelIcon(info) {
  return assetUrl(info && info.icon ? info.icon : "icon.png");
}
