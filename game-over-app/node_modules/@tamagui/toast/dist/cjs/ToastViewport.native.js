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
var ToastViewport_exports = {};
__export(ToastViewport_exports, {
  ToastViewport: () => ToastViewport,
  VIEWPORT_DEFAULT_HOTKEY: () => VIEWPORT_DEFAULT_HOTKEY,
  VIEWPORT_PAUSE: () => VIEWPORT_PAUSE,
  VIEWPORT_RESUME: () => VIEWPORT_RESUME
});
module.exports = __toCommonJS(ToastViewport_exports);
var import_jsx_runtime = require("react/jsx-runtime"),
  import_animate_presence = require("@tamagui/animate-presence"),
  import_compose_refs = require("@tamagui/compose-refs"),
  import_constants = require("@tamagui/constants"),
  import_core = require("@tamagui/core"),
  import_portal = require("@tamagui/portal"),
  import_stacks = require("@tamagui/stacks"),
  import_visually_hidden = require("@tamagui/visually-hidden"),
  React = __toESM(require("react"), 1),
  import_constants2 = require("./constants.native.js"),
  import_ToastPortal = require("./ToastPortal.native.js"),
  import_ToastProvider = require("./ToastProvider.native.js"),
  VIEWPORT_NAME = "ToastViewport",
  VIEWPORT_DEFAULT_HOTKEY = ["F8"],
  VIEWPORT_PAUSE = "toast.viewportPause",
  VIEWPORT_RESUME = "toast.viewportResume",
  ToastViewportWrapperFrame = (0, import_core.styled)(import_stacks.YStack, {
    name: "ViewportWrapper",
    variants: {
      unstyled: {
        false: {
          pointerEvents: "box-none",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          position: import_constants.isWeb ? "fixed" : "absolute",
          maxWidth: "100%",
          tabIndex: 0,
          zIndex: 1e5
        }
      }
    },
    defaultVariants: {
      unstyled: process.env.TAMAGUI_HEADLESS === "1"
    }
  }),
  ToastViewportFrame = (0, import_core.styled)(import_stacks.YStack, {
    name: VIEWPORT_NAME,
    variants: {
      unstyled: {
        false: {
          pointerEvents: "box-none",
          position: import_constants.isWeb ? "fixed" : "absolute",
          maxWidth: "100%"
        }
      }
    },
    defaultVariants: {
      unstyled: process.env.TAMAGUI_HEADLESS === "1"
    }
  }),
  ToastViewport = /* @__PURE__ */React.memo(/* @__PURE__ */React.forwardRef(function (props, forwardedRef) {
    var {
        scope,
        hotkey = VIEWPORT_DEFAULT_HOTKEY,
        label = "Notifications ({hotkey})",
        name = "default",
        multipleToasts,
        zIndex,
        portalToRoot,
        ...viewportProps
      } = props,
      context = (0, import_ToastProvider.useToastProviderContext)(scope),
      getItems = (0, import_ToastProvider.useCollection)(scope || import_constants2.TOAST_CONTEXT),
      headFocusProxyRef = React.useRef(null),
      tailFocusProxyRef = React.useRef(null),
      wrapperRef = React.useRef(null),
      ref = React.useRef(null),
      onViewportChange = React.useCallback(function (el) {
        context.viewports[name] !== el && context.onViewportChange(name, el);
      }, [name, context.viewports]),
      composedRefs = (0, import_compose_refs.useComposedRefs)(forwardedRef, ref, onViewportChange),
      hotkeyLabel = hotkey.join("+").replace(/Key/g, "").replace(/Digit/g, ""),
      hasToasts = context.toastCount > 0;
    React.useEffect(function () {
      if (import_constants.isWeb && context.toastCount !== 0) {
        var handleKeyDown = function (event) {
          var _ref_current,
            isHotkeyPressed = hotkey.every(function (key) {
              return event[key] || event.code === key;
            });
          isHotkeyPressed && ((_ref_current = ref.current) === null || _ref_current === void 0 || _ref_current.focus());
        };
        return document.addEventListener("keydown", handleKeyDown), function () {
          document.removeEventListener("keydown", handleKeyDown);
        };
      }
    }, [hotkey, context.toastCount]), React.useEffect(function () {
      if (import_constants.isWeb && context.toastCount !== 0) {
        var wrapper = wrapperRef.current,
          viewport = ref.current;
        if (hasToasts && wrapper && viewport) {
          var handlePause = function () {
              if (!context.isClosePausedRef.current) {
                var pauseEvent = new CustomEvent(VIEWPORT_PAUSE);
                viewport.dispatchEvent(pauseEvent), context.isClosePausedRef.current = !0;
              }
            },
            handleResume = function () {
              if (context.isClosePausedRef.current) {
                var resumeEvent = new CustomEvent(VIEWPORT_RESUME);
                viewport.dispatchEvent(resumeEvent), context.isClosePausedRef.current = !1;
              }
            },
            handleFocusOutResume = function (event) {
              var isFocusMovingOutside = !wrapper.contains(event.relatedTarget);
              isFocusMovingOutside && handleResume();
            },
            handlePointerLeaveResume = function () {
              var isFocusInside = wrapper.contains(document.activeElement);
              isFocusInside || handleResume();
            };
          return wrapper.addEventListener("focusin", handlePause), wrapper.addEventListener("focusout", handleFocusOutResume), wrapper.addEventListener("pointermove", handlePause), wrapper.addEventListener("pointerleave", handlePointerLeaveResume), window.addEventListener("blur", handlePause), window.addEventListener("focus", handleResume), function () {
            wrapper.removeEventListener("focusin", handlePause), wrapper.removeEventListener("focusout", handleFocusOutResume), wrapper.removeEventListener("pointermove", handlePause), wrapper.removeEventListener("pointerleave", handlePointerLeaveResume), window.removeEventListener("blur", handlePause), window.removeEventListener("focus", handleResume);
          };
        }
      }
    }, [hasToasts, context.isClosePausedRef, context.toastCount]);
    var getSortedTabbableCandidates = React.useCallback(function (param) {
      var {
          tabbingDirection
        } = param,
        toastItems = getItems(),
        tabbableCandidates = toastItems.map(function (toastItem) {
          var toastNode = toastItem.ref.current,
            toastTabbableCandidates = [toastNode, ...getTabbableCandidates(toastNode)];
          return tabbingDirection === "forwards" ? toastTabbableCandidates : toastTabbableCandidates.reverse();
        });
      return (tabbingDirection === "forwards" ? tabbableCandidates.reverse() : tabbableCandidates).flat();
    }, [getItems]);
    React.useEffect(function () {
      if (import_constants.isWeb && context.toastCount !== 0) {
        var viewport = ref.current;
        if (viewport) {
          var handleKeyDown = function (event) {
            var isMetaKey = event.altKey || event.ctrlKey || event.metaKey,
              isTabKey = event.key === "Tab" && !isMetaKey;
            if (isTabKey) {
              var focusedElement = document.activeElement,
                isTabbingBackwards = event.shiftKey,
                targetIsViewport = event.target === viewport;
              if (targetIsViewport && isTabbingBackwards) {
                var _headFocusProxyRef_current;
                (_headFocusProxyRef_current = headFocusProxyRef.current) === null || _headFocusProxyRef_current === void 0 || _headFocusProxyRef_current.focus();
                return;
              }
              var tabbingDirection = isTabbingBackwards ? "backwards" : "forwards",
                sortedCandidates = getSortedTabbableCandidates({
                  tabbingDirection
                }),
                index = sortedCandidates.findIndex(function (candidate) {
                  return candidate === focusedElement;
                });
              if (focusFirst(sortedCandidates.slice(index + 1))) event.preventDefault();else {
                var _headFocusProxyRef_current1, _tailFocusProxyRef_current;
                isTabbingBackwards ? (_headFocusProxyRef_current1 = headFocusProxyRef.current) === null || _headFocusProxyRef_current1 === void 0 || _headFocusProxyRef_current1.focus() : (_tailFocusProxyRef_current = tailFocusProxyRef.current) === null || _tailFocusProxyRef_current === void 0 || _tailFocusProxyRef_current.focus();
              }
            }
          };
          return viewport.addEventListener("keydown", handleKeyDown), function () {
            return viewport.removeEventListener("keydown", handleKeyDown);
          };
        }
      }
    }, [getItems, getSortedTabbableCandidates, context.toastCount]);
    var contents = /* @__PURE__ */(0, import_jsx_runtime.jsxs)(ToastViewportWrapperFrame, {
      ref: wrapperRef,
      // biome-ignore lint/a11y/useSemanticElements: <explanation>
      role: "region",
      "aria-label": label.replace("{hotkey}", hotkeyLabel),
      // // Ensure virtual cursor from landmarks menus triggers focus/blur for pause/resume
      tabIndex: -1,
      children: [
      // // incase list has size when empty (e.g. padding), we remove pointer events so
      // // it doesn't prevent interactions with page elements that it overlays
      // pointerEvents={hasToasts ? undefined : 'none'}
      hasToasts && /* @__PURE__ */(0, import_jsx_runtime.jsx)(FocusProxy, {
        context,
        viewportName: name,
        ref: headFocusProxyRef,
        onFocusFromOutsideViewport: function () {
          var tabbableCandidates = getSortedTabbableCandidates({
            tabbingDirection: "forwards"
          });
          focusFirst(tabbableCandidates);
        }
      }),
      /**
      * tabindex on the the list so that it can be focused when items are removed. we focus
      * the list instead of the viewport so it announces number of items remaining.
      */
      /* @__PURE__ */
      (0, import_jsx_runtime.jsx)(import_ToastProvider.Collection.Slot, {
        scope: context.toastScope,
        children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(ToastViewportFrame, {
          focusable: context.toastCount > 0,
          ref: composedRefs,
          ...viewportProps,
          children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_portal.PortalHost, {
            render: function (children) {
              return /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_animate_presence.AnimatePresence, {
                exitBeforeEnter: !multipleToasts,
                children
              });
            },
            name: name ?? "default"
          })
        })
      }), hasToasts && /* @__PURE__ */(0, import_jsx_runtime.jsx)(FocusProxy, {
        context,
        viewportName: name,
        ref: tailFocusProxyRef,
        onFocusFromOutsideViewport: function () {
          var tabbableCandidates = getSortedTabbableCandidates({
            tabbingDirection: "backwards"
          });
          focusFirst(tabbableCandidates);
        }
      })]
    });
    return portalToRoot ? /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_ToastPortal.ToastPortal, {
      context,
      ...(typeof zIndex == "number" ? {
        zIndex
      } : {}),
      children: contents
    }) : contents;
  }));
ToastViewport.displayName = VIEWPORT_NAME;
var FOCUS_PROXY_NAME = "ToastFocusProxy",
  FocusProxy = /* @__PURE__ */React.forwardRef(function (props, forwardedRef) {
    var {
        onFocusFromOutsideViewport,
        viewportName,
        context,
        ...proxyProps
      } = props,
      viewport = context.viewports[viewportName];
    return /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_visually_hidden.VisuallyHidden, {
      "aria-hidden": !0,
      tabIndex: 0,
      ...proxyProps,
      ref: forwardedRef,
      // Avoid page scrolling when focus is on the focus proxy
      position: import_constants.isWeb ? "fixed" : "absolute",
      onFocus: function (event) {
        if (import_constants.isWeb) {
          var prevFocusedElement = event.relatedTarget,
            isFocusFromOutsideViewport = !viewport?.contains(prevFocusedElement);
          isFocusFromOutsideViewport && onFocusFromOutsideViewport();
        }
      }
    });
  });
FocusProxy.displayName = FOCUS_PROXY_NAME;
function focusFirst(candidates) {
  if (import_constants.isWeb) {
    var previouslyFocusedElement = document.activeElement;
    return candidates.some(function (candidate) {
      return candidate === previouslyFocusedElement ? !0 : (candidate.focus(), document.activeElement !== previouslyFocusedElement);
    });
  }
}
function getTabbableCandidates(container) {
  if (!import_constants.isWeb) return [];
  for (var containerHtml = container, nodes = [], walker = document.createTreeWalker(containerHtml, NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (node) {
        var isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
        return node.disabled || node.hidden || isHiddenInput ? NodeFilter.FILTER_SKIP : node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }); walker.nextNode();) nodes.push(walker.currentNode);
  return nodes;
}
//# sourceMappingURL=ToastViewport.native.js.map
