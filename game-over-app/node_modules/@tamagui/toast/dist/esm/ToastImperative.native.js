import { jsx as _jsx } from "react/jsx-runtime";
import { isAndroid, isIos, isWeb } from "@tamagui/core";
import React from "react";
import { createNativeToast } from "./createNativeToast.native.js";
function _type_of(obj) {
  "@swc/helpers - typeof";

  return obj && typeof Symbol < "u" && obj.constructor === Symbol ? "symbol" : typeof obj;
}
var ToastContext = /* @__PURE__ */React.createContext({}),
  ToastCurrentContext = /* @__PURE__ */React.createContext(null),
  useToastController = function () {
    return React.useContext(ToastContext);
  },
  useToastState = function () {
    return React.useContext(ToastCurrentContext);
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
      counterRef = React.useRef(0),
      [toast, setToast] = React.useState(null),
      [lastNativeToastRef, setLastNativeToastRef] = React.useState(null),
      show = React.useCallback(function (title, showOptions) {
        var _showOptions_native,
          native = (_showOptions_native = showOptions?.native) !== null && _showOptions_native !== void 0 ? _showOptions_native : options.native,
          isWebNative = Array.isArray(native) ? native.includes("web") : native === "web",
          isMobileNative = Array.isArray(native) ? native.includes("mobile") : native === "mobile",
          isAndroidNative = isMobileNative || (Array.isArray(native) ? native.includes("android") : native === "android"),
          isIosNative = isMobileNative || (Array.isArray(native) ? native.includes("ios") : native === "ios"),
          isHandledNatively = native === !0 || isWeb && isWebNative || !isWeb && isMobileNative || isAndroid && isAndroidNative || isIos && isIosNative;
        if (isHandledNatively) {
          var nativeToastResult = createNativeToast(title, showOptions ?? {});
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
      hide = React.useCallback(function () {
        lastNativeToastRef?.close(), setToast(function (prev) {
          return prev ? {
            ...prev,
            hide: !0
          } : null;
        }), setTimeout(function () {
          setToast(null);
        }, 100);
      }, [setToast, lastNativeToastRef]),
      contextValue = React.useMemo(function () {
        return {
          show,
          hide,
          nativeToast: lastNativeToastRef,
          options
        };
      }, [show, hide, lastNativeToastRef, JSON.stringify(options || null)]);
    return /* @__PURE__ */_jsx(ToastContext.Provider, {
      value: contextValue,
      children: /* @__PURE__ */_jsx(ToastCurrentContext.Provider, {
        value: toast,
        children
      })
    });
  };
export { ToastImperativeProvider, useToast, useToastController, useToastState };
//# sourceMappingURL=ToastImperative.native.js.map
