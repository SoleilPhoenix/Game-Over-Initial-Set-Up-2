"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
    for (var name in all) __defProp(target, name, {
      get: all[name],
      enumerable: !0
    });
  },
  __copyProps = (to, from, except, desc) => {
    if (from && typeof from == "object" || typeof from == "function") for (let key of __getOwnPropNames(from)) !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    });
    return to;
  };
var __toCommonJS = mod => __copyProps(__defProp({}, "__esModule", {
  value: !0
}), mod);
var ToastPortal_exports = {};
__export(ToastPortal_exports, {
  ToastPortal: () => ToastPortal
});
module.exports = __toCommonJS(ToastPortal_exports);
var import_jsx_runtime = require("react/jsx-runtime"),
  import_portal = require("@tamagui/portal"),
  import_react_native = require("react-native"),
  import_ToastProvider = require("./ToastProvider.native.js");
function ToastPortal(props) {
  var {
      context,
      children,
      zIndex
    } = props,
    content = children;
  return (import_react_native.Platform.OS === "android" || import_react_native.Platform.OS === "ios") && (content = /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_ToastProvider.ReprogapateToastProvider, {
    context,
    children
  })), /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_portal.Portal, {
    zIndex: zIndex || Number.MAX_SAFE_INTEGER,
    children: content
  });
}
//# sourceMappingURL=ToastPortal.native.js.map
