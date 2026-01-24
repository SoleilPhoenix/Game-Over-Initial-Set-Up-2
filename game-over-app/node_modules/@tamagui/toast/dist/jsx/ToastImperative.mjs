import { isAndroid, isIos, isWeb } from "@tamagui/core";
import React from "react";
import { createNativeToast } from "./createNativeToast.mjs";
import { jsx } from "react/jsx-runtime";
const ToastContext = React.createContext({}),
  ToastCurrentContext = React.createContext(null),
  useToastController = () => React.useContext(ToastContext),
  useToastState = () => React.useContext(ToastCurrentContext),
  useToast = () => ({
    ...useToastController(),
    currentToast: useToastState()
  }),
  ToastImperativeProvider = ({
    children,
    options
  }) => {
    const counterRef = React.useRef(0),
      [toast, setToast] = React.useState(null),
      [lastNativeToastRef, setLastNativeToastRef] = React.useState(null),
      show = React.useCallback((title, showOptions) => {
        const native = showOptions?.native ?? options.native,
          isWebNative = Array.isArray(native) ? native.includes("web") : native === "web",
          isMobileNative = Array.isArray(native) ? native.includes("mobile") : native === "mobile",
          isAndroidNative = isMobileNative || (Array.isArray(native) ? native.includes("android") : native === "android"),
          isIosNative = isMobileNative || (Array.isArray(native) ? native.includes("ios") : native === "ios"),
          isHandledNatively = native === !0 || isWeb && isWebNative || !isWeb && isMobileNative || isAndroid && isAndroidNative || isIos && isIosNative;
        if (isHandledNatively) {
          const nativeToastResult = createNativeToast(title, showOptions ?? {});
          typeof nativeToastResult == "object" && nativeToastResult.nativeToastRef && setLastNativeToastRef(nativeToastResult.nativeToastRef);
        }
        return counterRef.current++, setToast({
          ...showOptions?.customData,
          ...showOptions,
          viewportName: showOptions?.viewportName ?? "default",
          title,
          id: counterRef.current.toString(),
          isHandledNatively
        }), !0;
      }, [setToast, JSON.stringify(options.native || null)]),
      hide = React.useCallback(() => {
        lastNativeToastRef?.close(), setToast(prev => prev ? {
          ...prev,
          hide: !0
        } : null), setTimeout(() => {
          setToast(null);
        }, 100);
      }, [setToast, lastNativeToastRef]),
      contextValue = React.useMemo(() => ({
        show,
        hide,
        nativeToast: lastNativeToastRef,
        options
      }), [show, hide, lastNativeToastRef, JSON.stringify(options || null)]);
    return /* @__PURE__ */jsx(ToastContext.Provider, {
      value: contextValue,
      children: /* @__PURE__ */jsx(ToastCurrentContext.Provider, {
        value: toast,
        children
      })
    });
  };
export { ToastImperativeProvider, useToast, useToastController, useToastState };
//# sourceMappingURL=ToastImperative.mjs.map
