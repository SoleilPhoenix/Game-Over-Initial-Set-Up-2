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
var ToastProvider_exports = {};
__export(ToastProvider_exports, {
  Collection: () => Collection,
  ReprogapateToastProvider: () => ReprogapateToastProvider,
  ToastProvider: () => ToastProvider,
  useCollection: () => useCollection,
  useToastProviderContext: () => useToastProviderContext
});
module.exports = __toCommonJS(ToastProvider_exports);
var import_jsx_runtime = require("react/jsx-runtime"),
  import_collection = require("@tamagui/collection"),
  import_core = require("@tamagui/core"),
  import_start_transition = require("@tamagui/start-transition"),
  React = __toESM(require("react"), 1),
  import_constants = require("./constants.native.js"),
  import_ToastImperative = require("./ToastImperative.native.js"),
  PROVIDER_NAME = "ToastProvider",
  [Collection, useCollection] = (0, import_collection.createCollection)("Toast"),
  {
    Provider: ToastProviderProvider,
    useStyledContext: useToastProviderContext
  } = (0, import_core.createStyledContext)(
  // since we always provide this we can avoid setting here
  {}, "Toast__"),
  ToastProvider = function (props) {
    var {
        scope = import_constants.TOAST_CONTEXT,
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
        (0, import_start_transition.startTransition)(function () {
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
    return /* @__PURE__ */(0, import_jsx_runtime.jsx)(Collection.Provider, {
      scope,
      children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(ToastProviderProvider, {
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
          (0, import_start_transition.startTransition)(function () {
            setToastCount(function (prevCount) {
              return prevCount + 1;
            });
          });
        }, []),
        onToastRemove: React.useCallback(function () {
          (0, import_start_transition.startTransition)(function () {
            setToastCount(function (prevCount) {
              return prevCount - 1;
            });
          });
        }, []),
        isFocusedToastEscapeKeyDownRef,
        isClosePausedRef,
        options,
        children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_ToastImperative.ToastImperativeProvider, {
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
  return /* @__PURE__ */(0, import_jsx_runtime.jsx)(Collection.Provider, {
    scope: context.toastScope,
    children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(ToastProviderProvider, {
      ...context,
      children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_ToastImperative.ToastImperativeProvider, {
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
//# sourceMappingURL=ToastProvider.native.js.map
