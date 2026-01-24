"use strict";

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf,
  __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
    value: mod,
    enumerable: !0
  }) : target, mod)),
  __toCommonJS = mod => __copyProps(__defProp({}, "__esModule", {
    value: !0
  }), mod);
var ToastImperative_exports = {};
__export(ToastImperative_exports, {
  ToastImperativeProvider: () => ToastImperativeProvider,
  useToast: () => useToast,
  useToastController: () => useToastController,
  useToastState: () => useToastState
});
module.exports = __toCommonJS(ToastImperative_exports);
var import_jsx_runtime = require("react/jsx-runtime"),
  import_core = require("@tamagui/core"),
  import_react = __toESM(require("react"), 1),
  import_createNativeToast = require("./createNativeToast.native.js");
function _type_of(obj) {
  "@swc/helpers - typeof";

  return obj && typeof Symbol < "u" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
var ToastContext = /* @__PURE__ */import_react.default.createContext({}),
  ToastCurrentContext = /* @__PURE__ */import_react.default.createContext(null),
  useToastController = function () {
    return import_react.default.useContext(ToastContext);
  },
  useToastState = function () {
    return import_react.default.useContext(ToastCurrentContext);
  },
  useToast = function () {
    return {
      ...useToastController(),
      currentToast: useToastState()
    };
  },
  ToastImperativeProvider = function (param) {
    var {
        children,
        options
      } = param,
      counterRef = import_react.default.useRef(0),
      [toast, setToast] = import_react.default.useState(null),
      [lastNativeToastRef, setLastNativeToastRef] = import_react.default.useState(null),
      show = import_react.default.useCallback(function (title, showOptions) {
        var _showOptions_native,
          native = (_showOptions_native = showOptions?.native) !== null && _showOptions_native !== void 0 ? _showOptions_native : options.native,
          isWebNative = Array.isArray(native) ? native.includes("web") : native === "web",
          isMobileNative = Array.isArray(native) ? native.includes("mobile") : native === "mobile",
          isAndroidNative = isMobileNative || (Array.isArray(native) ? native.includes("android") : native === "android"),
          isIosNative = isMobileNative || (Array.isArray(native) ? native.includes("ios") : native === "ios"),
          isHandledNatively = native === !0 || import_core.isWeb && isWebNative || !import_core.isWeb && isMobileNative || import_core.isAndroid && isAndroidNative || import_core.isIos && isIosNative;
        if (isHandledNatively) {
          var nativeToastResult = (0, import_createNativeToast.createNativeToast)(title, showOptions ?? {});
          (typeof nativeToastResult > "u" ? "undefined" : _type_of(nativeToastResult)) === "object" && nativeToastResult.nativeToastRef && setLastNativeToastRef(nativeToastResult.nativeToastRef);
        }
        counterRef.current++;
        var _showOptions_viewportName;
        return setToast({
          ...showOptions?.customData,
          ...showOptions,
          viewportName: (_showOptions_viewportName = showOptions?.viewportName) !== null && _showOptions_viewportName !== void 0 ? _showOptions_viewportName : "default",
          title,
          id: counterRef.current.toString(),
          isHandledNatively
        }), !0;
      }, [setToast, JSON.stringify(options.native || null)]),
      hide = import_react.default.useCallback(function () {
        lastNativeToastRef?.close(), setToast(function (prev) {
          return prev ? {
            ...prev,
            hide: !0
          } : null;
        }), setTimeout(function () {
          setToast(null);
        }, 100);
      }, [setToast, lastNativeToastRef]),
      contextValue = import_react.default.useMemo(function () {
        return {
          show,
          hide,
          nativeToast: lastNativeToastRef,
          options
        };
      }, [show, hide, lastNativeToastRef, JSON.stringify(options || null)]);
    return /* @__PURE__ */(0, import_jsx_runtime.jsx)(ToastContext.Provider, {
      value: contextValue,
      children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(ToastCurrentContext.Provider, {
        value: toast,
        children
      })
    });
  };
//# sourceMappingURL=ToastImperative.native.js.map
