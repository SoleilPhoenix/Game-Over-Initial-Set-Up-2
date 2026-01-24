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
var import_animate_presence = require("@tamagui/animate-presence"),
  import_compose_refs = require("@tamagui/compose-refs"),
  import_constants = require("@tamagui/constants"),
  import_core = require("@tamagui/core"),
  import_portal = require("@tamagui/portal"),
  import_stacks = require("@tamagui/stacks"),
  import_visually_hidden = require("@tamagui/visually-hidden"),
  React = __toESM(require("react"), 1),
  import_constants2 = require("./constants.cjs"),
  import_ToastPortal = require("./ToastPortal.cjs"),
  import_ToastProvider = require("./ToastProvider.cjs"),
  import_jsx_runtime = require("react/jsx-runtime");
const VIEWPORT_NAME = "ToastViewport",
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
  ToastViewport = React.memo(React.forwardRef((props, forwardedRef) => {
    const {
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
      onViewportChange = React.useCallback(el => {
        context.viewports[name] !== el && context.onViewportChange(name, el);
      }, [name, context.viewports]),
      composedRefs = (0, import_compose_refs.useComposedRefs)(forwardedRef, ref, onViewportChange),
      hotkeyLabel = hotkey.join("+").replace(/Key/g, "").replace(/Digit/g, ""),
      hasToasts = context.toastCount > 0;
    React.useEffect(() => {
      if (!import_constants.isWeb || context.toastCount === 0) return;
      const handleKeyDown = event => {
        hotkey.every(key => event[key] || event.code === key) && ref.current?.focus();
      };
      return document.addEventListener("keydown", handleKeyDown), () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [hotkey, context.toastCount]), React.useEffect(() => {
      if (!import_constants.isWeb || context.toastCount === 0) return;
      const wrapper = wrapperRef.current,
        viewport = ref.current;
      if (hasToasts && wrapper && viewport) {
        const handlePause = () => {
            if (!context.isClosePausedRef.current) {
              const pauseEvent = new CustomEvent(VIEWPORT_PAUSE);
              viewport.dispatchEvent(pauseEvent), context.isClosePausedRef.current = !0;
            }
          },
          handleResume = () => {
            if (context.isClosePausedRef.current) {
              const resumeEvent = new CustomEvent(VIEWPORT_RESUME);
              viewport.dispatchEvent(resumeEvent), context.isClosePausedRef.current = !1;
            }
          },
          handleFocusOutResume = event => {
            !wrapper.contains(event.relatedTarget) && handleResume();
          },
          handlePointerLeaveResume = () => {
            wrapper.contains(document.activeElement) || handleResume();
          };
        return wrapper.addEventListener("focusin", handlePause), wrapper.addEventListener("focusout", handleFocusOutResume), wrapper.addEventListener("pointermove", handlePause), wrapper.addEventListener("pointerleave", handlePointerLeaveResume), window.addEventListener("blur", handlePause), window.addEventListener("focus", handleResume), () => {
          wrapper.removeEventListener("focusin", handlePause), wrapper.removeEventListener("focusout", handleFocusOutResume), wrapper.removeEventListener("pointermove", handlePause), wrapper.removeEventListener("pointerleave", handlePointerLeaveResume), window.removeEventListener("blur", handlePause), window.removeEventListener("focus", handleResume);
        };
      }
    }, [hasToasts, context.isClosePausedRef, context.toastCount]);
    const getSortedTabbableCandidates = React.useCallback(({
      tabbingDirection
    }) => {
      const tabbableCandidates = getItems().map(toastItem => {
        const toastNode = toastItem.ref.current,
          toastTabbableCandidates = [toastNode, ...getTabbableCandidates(toastNode)];
        return tabbingDirection === "forwards" ? toastTabbableCandidates : toastTabbableCandidates.reverse();
      });
      return (tabbingDirection === "forwards" ? tabbableCandidates.reverse() : tabbableCandidates).flat();
    }, [getItems]);
    React.useEffect(() => {
      if (!import_constants.isWeb || context.toastCount === 0) return;
      const viewport = ref.current;
      if (viewport) {
        const handleKeyDown = event => {
          const isMetaKey = event.altKey || event.ctrlKey || event.metaKey;
          if (event.key === "Tab" && !isMetaKey) {
            const focusedElement = document.activeElement,
              isTabbingBackwards = event.shiftKey;
            if (event.target === viewport && isTabbingBackwards) {
              headFocusProxyRef.current?.focus();
              return;
            }
            const sortedCandidates = getSortedTabbableCandidates({
                tabbingDirection: isTabbingBackwards ? "backwards" : "forwards"
              }),
              index = sortedCandidates.findIndex(candidate => candidate === focusedElement);
            focusFirst(sortedCandidates.slice(index + 1)) ? event.preventDefault() : isTabbingBackwards ?
            // @ts-ignore ali TODO type
            headFocusProxyRef.current?.focus() :
            // @ts-ignore ali TODO type
            tailFocusProxyRef.current?.focus();
          }
        };
        return viewport.addEventListener("keydown", handleKeyDown), () => viewport.removeEventListener("keydown", handleKeyDown);
      }
    }, [getItems, getSortedTabbableCandidates, context.toastCount]);
    const contents = /* @__PURE__ */(0, import_jsx_runtime.jsxs)(ToastViewportWrapperFrame, {
      ref: wrapperRef,
      role: "region",
      "aria-label": label.replace("{hotkey}", hotkeyLabel),
      tabIndex: -1,
      children: [hasToasts && /* @__PURE__ */(0, import_jsx_runtime.jsx)(FocusProxy, {
        context,
        viewportName: name,
        ref: headFocusProxyRef,
        onFocusFromOutsideViewport: () => {
          const tabbableCandidates = getSortedTabbableCandidates({
            tabbingDirection: "forwards"
          });
          focusFirst(tabbableCandidates);
        }
      }), /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_ToastProvider.Collection.Slot, {
        scope: context.toastScope,
        children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(ToastViewportFrame, {
          focusable: context.toastCount > 0,
          ref: composedRefs,
          ...viewportProps,
          children: /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_portal.PortalHost, {
            render: children => /* @__PURE__ */(0, import_jsx_runtime.jsx)(import_animate_presence.AnimatePresence, {
              exitBeforeEnter: !multipleToasts,
              children
            }),
            name: name ?? "default"
          })
        })
      }), hasToasts && /* @__PURE__ */(0, import_jsx_runtime.jsx)(FocusProxy, {
        context,
        viewportName: name,
        ref: tailFocusProxyRef,
        onFocusFromOutsideViewport: () => {
          const tabbableCandidates = getSortedTabbableCandidates({
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
const FOCUS_PROXY_NAME = "ToastFocusProxy",
  FocusProxy = React.forwardRef((props, forwardedRef) => {
    const {
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
      position: import_constants.isWeb ? "fixed" : "absolute",
      onFocus: event => {
        if (!import_constants.isWeb) return;
        const prevFocusedElement = event.relatedTarget;
        !viewport?.contains(prevFocusedElement) && onFocusFromOutsideViewport();
      }
    });
  });
FocusProxy.displayName = FOCUS_PROXY_NAME;
function focusFirst(candidates) {
  if (!import_constants.isWeb) return;
  const previouslyFocusedElement = document.activeElement;
  return candidates.some(candidate => candidate === previouslyFocusedElement ? !0 : (candidate.focus(), document.activeElement !== previouslyFocusedElement));
}
function getTabbableCandidates(container) {
  if (!import_constants.isWeb) return [];
  const containerHtml = container,
    nodes = [],
    walker = document.createTreeWalker(containerHtml, NodeFilter.SHOW_ELEMENT, {
      acceptNode: node => {
        const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
        return node.disabled || node.hidden || isHiddenInput ? NodeFilter.FILTER_SKIP : node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
  for (; walker.nextNode();) nodes.push(walker.currentNode);
  return nodes;
}