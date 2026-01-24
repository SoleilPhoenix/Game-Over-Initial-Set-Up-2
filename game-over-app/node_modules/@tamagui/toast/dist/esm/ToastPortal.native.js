import { jsx as _jsx } from "react/jsx-runtime";
import { Portal } from "@tamagui/portal";
import { Platform } from "react-native";
import { ReprogapateToastProvider } from "./ToastProvider.native.js";
function ToastPortal(props) {
  var {
      context,
      children,
      zIndex
    } = props,
    content = children;
  return (Platform.OS === "android" || Platform.OS === "ios") && (content = /* @__PURE__ */_jsx(ReprogapateToastProvider, {
    context,
    children
  })), /* @__PURE__ */_jsx(Portal, {
    zIndex: zIndex || Number.MAX_SAFE_INTEGER,
    children: content
  });
}
export { ToastPortal };
//# sourceMappingURL=ToastPortal.native.js.map
