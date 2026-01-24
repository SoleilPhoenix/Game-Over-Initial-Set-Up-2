import { createCollection } from "@tamagui/collection";
import { createStyledContext } from "@tamagui/core";
import { startTransition } from "@tamagui/start-transition";
import * as React from "react";
import { TOAST_CONTEXT } from "./constants.mjs";
import { ToastImperativeProvider } from "./ToastImperative.mjs";
import { jsx } from "react/jsx-runtime";
const PROVIDER_NAME = "ToastProvider",
  [Collection, useCollection] = createCollection("Toast"),
  {
    Provider: ToastProviderProvider,
    useStyledContext: useToastProviderContext
  } = createStyledContext(
  // since we always provide this we can avoid setting here
  {}, "Toast__"),
  ToastProvider = props => {
    const {
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
      handleViewportChange = React.useCallback((name, viewport) => {
        startTransition(() => {
          setViewports(prev => ({
            ...prev,
            [name]: viewport
          }));
        });
      }, []),
      options = React.useMemo(() => ({
        duration,
        burntOptions,
        native,
        notificationOptions
      }), [JSON.stringify([duration, burntOptions, native, notificationOptions])]);
    return /* @__PURE__ */jsx(Collection.Provider, {
      scope,
      children: /* @__PURE__ */jsx(ToastProviderProvider, {
        scope,
        id,
        label,
        duration,
        swipeDirection,
        swipeThreshold,
        toastCount,
        viewports,
        onViewportChange: handleViewportChange,
        onToastAdd: React.useCallback(() => {
          startTransition(() => {
            setToastCount(prevCount => prevCount + 1);
          });
        }, []),
        onToastRemove: React.useCallback(() => {
          startTransition(() => {
            setToastCount(prevCount => prevCount - 1);
          });
        }, []),
        isFocusedToastEscapeKeyDownRef,
        isClosePausedRef,
        options,
        children: /* @__PURE__ */jsx(ToastImperativeProvider, {
          options,
          children
        })
      })
    });
  };
function ReprogapateToastProvider(props) {
  const {
    children,
    context
  } = props;
  return /* @__PURE__ */jsx(Collection.Provider, {
    scope: context.toastScope,
    children: /* @__PURE__ */jsx(ToastProviderProvider, {
      ...context,
      children: /* @__PURE__ */jsx(ToastImperativeProvider, {
        options: context.options,
        children
      })
    })
  });
}
ToastProvider.propTypes = {
  label(props) {
    if (props.label && typeof props.label == "string" && !props.label.trim()) {
      const error = `Invalid prop \`label\` supplied to \`${PROVIDER_NAME}\`. Expected non-empty \`string\`.`;
      return new Error(error);
    }
    return null;
  }
};
ToastProvider.displayName = PROVIDER_NAME;
export { Collection, ReprogapateToastProvider, ToastProvider, useCollection, useToastProviderContext };
//# sourceMappingURL=ToastProvider.mjs.map
