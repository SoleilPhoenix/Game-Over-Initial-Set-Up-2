import { jsx as _jsx } from "react/jsx-runtime";
import { createCollection } from "@tamagui/collection";
import { createStyledContext } from "@tamagui/core";
import { startTransition } from "@tamagui/start-transition";
import * as React from "react";
import { TOAST_CONTEXT } from "./constants.native.js";
import { ToastImperativeProvider } from "./ToastImperative.native.js";
var PROVIDER_NAME = "ToastProvider",
  [Collection, useCollection] = createCollection("Toast"),
  {
    Provider: ToastProviderProvider,
    useStyledContext: useToastProviderContext
  } = createStyledContext(
  // since we always provide this we can avoid setting here
  {}, "Toast__"),
  ToastProvider = function (props) {
    var {
        scope = TOAST_CONTEXT,
        id: providedId,
        burntOptions,
        native,
        notificationOptions,
        label = "Notification",
        duration = 5e3,
        swipeDirection = "right",
        swipeThreshold = 50,
        children
      } = props,
      backupId = React.useId(),
      id = providedId ?? backupId,
      [viewports, setViewports] = React.useState({}),
      [toastCount, setToastCount] = React.useState(0),
      isFocusedToastEscapeKeyDownRef = React.useRef(!1),
      isClosePausedRef = React.useRef(!1),
      handleViewportChange = React.useCallback(function (name, viewport) {
        startTransition(function () {
          setViewports(function (prev) {
            return {
              ...prev,
              [name]: viewport
            };
          });
        });
      }, []),
      options = React.useMemo(function () {
        return {
          duration,
          burntOptions,
          native,
          notificationOptions
        };
      },
      // nested simple object so JSON.stringify
      [JSON.stringify([duration, burntOptions, native, notificationOptions])]);
    return /* @__PURE__ */_jsx(Collection.Provider, {
      scope,
      children: /* @__PURE__ */_jsx(ToastProviderProvider, {
        scope,
        id,
        label,
        duration,
        swipeDirection,
        swipeThreshold,
        toastCount,
        viewports,
        onViewportChange: handleViewportChange,
        onToastAdd: React.useCallback(function () {
          startTransition(function () {
            setToastCount(function (prevCount) {
              return prevCount + 1;
            });
          });
        }, []),
        onToastRemove: React.useCallback(function () {
          startTransition(function () {
            setToastCount(function (prevCount) {
              return prevCount - 1;
            });
          });
        }, []),
        isFocusedToastEscapeKeyDownRef,
        isClosePausedRef,
        options,
        children: /* @__PURE__ */_jsx(ToastImperativeProvider, {
          options,
          children
        })
      })
    });
  };
function ReprogapateToastProvider(props) {
  var {
    children,
    context
  } = props;
  return /* @__PURE__ */_jsx(Collection.Provider, {
    scope: context.toastScope,
    children: /* @__PURE__ */_jsx(ToastProviderProvider, {
      ...context,
      children: /* @__PURE__ */_jsx(ToastImperativeProvider, {
        options: context.options,
        children
      })
    })
  });
}
ToastProvider.propTypes = {
  label(props) {
    if (props.label && typeof props.label == "string" && !props.label.trim()) {
      var error = `Invalid prop \`label\` supplied to \`${PROVIDER_NAME}\`. Expected non-empty \`string\`.`;
      return new Error(error);
    }
    return null;
  }
};
ToastProvider.displayName = PROVIDER_NAME;
export { Collection, ReprogapateToastProvider, ToastProvider, useCollection, useToastProviderContext };
//# sourceMappingURL=ToastProvider.native.js.map
