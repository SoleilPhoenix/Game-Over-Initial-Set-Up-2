import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence } from "@tamagui/animate-presence";
import { useComposedRefs } from "@tamagui/compose-refs";
import { isWeb } from "@tamagui/constants";
import { styled } from "@tamagui/core";
import { PortalHost } from "@tamagui/portal";
import { YStack } from "@tamagui/stacks";
import { VisuallyHidden } from "@tamagui/visually-hidden";
import * as React from "react";
import { TOAST_CONTEXT } from "./constants.native.js";
import { ToastPortal } from "./ToastPortal.native.js";
import { Collection, useCollection, useToastProviderContext } from "./ToastProvider.native.js";
var VIEWPORT_NAME = "ToastViewport",
  VIEWPORT_DEFAULT_HOTKEY = ["F8"],
  VIEWPORT_PAUSE = "toast.viewportPause",
  VIEWPORT_RESUME = "toast.viewportResume",
  ToastViewportWrapperFrame = styled(YStack, {
    name: "ViewportWrapper",
    variants: {
      unstyled: {
        false: {
          pointerEvents: "box-none",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          position: isWeb ? "fixed" : "absolute",
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
  ToastViewportFrame = styled(YStack, {
    name: VIEWPORT_NAME,
    variants: {
      unstyled: {
        false: {
          pointerEvents: "box-none",
          position: isWeb ? "fixed" : "absolute",
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
      context = useToastProviderContext(scope),
      getItems = useCollection(scope || TOAST_CONTEXT),
      headFocusProxyRef = React.useRef(null),
      tailFocusProxyRef = React.useRef(null),
      wrapperRef = React.useRef(null),
      ref = React.useRef(null),
      onViewportChange = React.useCallback(function (el) {
        context.viewports[name] !== el && context.onViewportChange(name, el);
      }, [name, context.viewports]),
      composedRefs = useComposedRefs(forwardedRef, ref, onViewportChange),
      hotkeyLabel = hotkey.join("+").replace(/Key/g, "").replace(/Digit/g, ""),
      hasToasts = context.toastCount > 0;
    React.useEffect(function () {
      if (isWeb && context.toastCount !== 0) {
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
      if (isWeb && context.toastCount !== 0) {
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
      if (isWeb && context.toastCount !== 0) {
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
    var contents = /* @__PURE__ */_jsxs(ToastViewportWrapperFrame, {
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
      hasToasts && /* @__PURE__ */_jsx(FocusProxy, {
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
      _jsx(Collection.Slot, {
        scope: context.toastScope,
        children: /* @__PURE__ */_jsx(ToastViewportFrame, {
          focusable: context.toastCount > 0,
          ref: composedRefs,
          ...viewportProps,
          children: /* @__PURE__ */_jsx(PortalHost, {
            render: function (children) {
              return /* @__PURE__ */_jsx(AnimatePresence, {
                exitBeforeEnter: !multipleToasts,
                children
              });
            },
            name: name ?? "default"
          })
        })
      }), hasToasts && /* @__PURE__ */_jsx(FocusProxy, {
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
    return portalToRoot ? /* @__PURE__ */_jsx(ToastPortal, {
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
    return /* @__PURE__ */_jsx(VisuallyHidden, {
      "aria-hidden": !0,
      tabIndex: 0,
      ...proxyProps,
      ref: forwardedRef,
      // Avoid page scrolling when focus is on the focus proxy
      position: isWeb ? "fixed" : "absolute",
      onFocus: function (event) {
        if (isWeb) {
          var prevFocusedElement = event.relatedTarget,
            isFocusFromOutsideViewport = !viewport?.contains(prevFocusedElement);
          isFocusFromOutsideViewport && onFocusFromOutsideViewport();
        }
      }
    });
  });
FocusProxy.displayName = FOCUS_PROXY_NAME;
function focusFirst(candidates) {
  if (isWeb) {
    var previouslyFocusedElement = document.activeElement;
    return candidates.some(function (candidate) {
      return candidate === previouslyFocusedElement ? !0 : (candidate.focus(), document.activeElement !== previouslyFocusedElement);
    });
  }
}
function getTabbableCandidates(container) {
  if (!isWeb) return [];
  for (var containerHtml = container, nodes = [], walker = document.createTreeWalker(containerHtml, NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (node) {
        var isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
        return node.disabled || node.hidden || isHiddenInput ? NodeFilter.FILTER_SKIP : node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }); walker.nextNode();) nodes.push(walker.currentNode);
  return nodes;
}
export { ToastViewport, VIEWPORT_DEFAULT_HOTKEY, VIEWPORT_PAUSE, VIEWPORT_RESUME };
//# sourceMappingURL=ToastViewport.native.js.map
