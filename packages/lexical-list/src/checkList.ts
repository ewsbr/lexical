/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Signal} from '@lexical/extension';

import {calculateZoomLevel} from '@lexical/utils';
import {
  $addUpdateTag,
  $findMatchingParent,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  type ElementNode,
  getActiveElement,
  getNearestEditorFromDOMNode,
  getParentElement,
  IS_FIREFOX,
  isHTMLElement,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_SPACE_COMMAND,
  type LexicalCommand,
  type LexicalEditor,
  mergeRegister,
  type NodeKey,
  registerEventListeners,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SELECTION_FOCUS_TAG,
} from 'lexical';

import {$insertList} from './formatList';
import {$isListItemNode, type ListItemNode} from './LexicalListItemNode';
import {$isListNode} from './LexicalListNode';

// What a focused check list item's own key handlers use: Space toggles it,
// the vertical arrows move to the sibling item and keep the checkbox focused,
// Escape hands the focus back itself, and the left arrow is the one key that
// means either thing -- it is what moves the focus onto the checkbox, and
// pressing it again is what leaves the item -- so its handler decides rather
// than the listener below. The modifiers are here because pressing one on its
// own operates nothing at all.
const CHECKBOX_KEYS = new Set([
  ' ',
  'Alt',
  'ArrowDown',
  'ArrowLeft',
  'ArrowUp',
  'CapsLock',
  'Control',
  'Escape',
  'Meta',
  'Shift',
]);

// How far the check mark's hit area reaches beyond it for a touch, in CSS
// pixels.
const TOUCH_CLICK_AREA_PADDING = 32;
// How far a finger may travel during a tap on the check mark, in CSS pixels.
// Browsers start scrolling past about 8.
const TOUCH_TAP_SLOP = 16;
// How long a tap holds the scroll where it began, in milliseconds, while a
// fling its drift started runs out.
const TOUCH_SCROLL_HOLD_MS = 600;

type ScrollTops = [Element, number][];

type TouchPress = {
  item: HTMLElement;
  scrollTops: ScrollTops;
  x: number;
  y: number;
};

export const INSERT_CHECK_LIST_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_CHECK_LIST_COMMAND',
);

/**
 * Registers the checklist plugin with the editor.
 * @param editor The LexicalEditor instance.
 * @param options Optional configuration.
 *   - disableTakeFocusOnClick: If true, clicking a checklist item will not focus the editor (useful for mobile).
 */
export function registerCheckList(
  editor: LexicalEditor,
  options?: {disableTakeFocusOnClick?: boolean | Signal<boolean>},
) {
  const disableTakeFocusOnClick =
    (options && options.disableTakeFocusOnClick) || false;
  const peekDisableTakeFocusOnClick =
    typeof disableTakeFocusOnClick === 'boolean'
      ? () => disableTakeFocusOnClick
      : disableTakeFocusOnClick.peek.bind(disableTakeFocusOnClick);

  // A tap on the marker is taken from touch events rather than pointer
  // events. A finger that drifts a few pixels during a tap starts a scroll,
  // which ends the pointer in pointercancel rather than pointerup (Firefox
  // sends pointercancel for any movement at all), while the touch still ends
  // in touchend. So the tap allows the finger TOUCH_TAP_SLOP of travel, puts
  // back whatever the drift scrolled, and cancels the touchend, which keeps
  // the browser from placing the caret or sending a click. Moving further is
  // a swipe, which scrolls and toggles nothing. Canceling the touchmoves of a
  // tap would keep it from scrolling in Chrome, but Firefox then holds the
  // whole touch, swipes included; canceling the touchstart would keep every
  // swipe that starts on the marker from scrolling.
  let touchPress: TouchPress | null = null;
  let heldScroll: {scrollTops: ScrollTops; until: number} | null = null;
  const handleTouchStart = (event: TouchEvent) => {
    touchPress = null;
    heldScroll = null;
    if (event.touches.length !== 1 || !editor.isEditable()) {
      return;
    }
    const touch = event.touches[0];
    const item = event.target;
    if (isCheckMarkHit(item, touch.clientX, true)) {
      touchPress = {
        item,
        scrollTops: getAncestorScrollTops(item),
        x: touch.clientX,
        y: touch.clientY,
      };
    }
  };
  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (
      touchPress !== null &&
      Math.hypot(touch.clientX - touchPress.x, touch.clientY - touchPress.y) >
        TOUCH_TAP_SLOP
    ) {
      touchPress = null;
    }
  };
  const handleTouchEnd = (event: TouchEvent) => {
    const press = touchPress;
    touchPress = null;
    if (press === null) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    restoreScrollTops(press.scrollTops);
    heldScroll = {
      scrollTops: press.scrollTops,
      until: event.timeStamp + TOUCH_SCROLL_HOLD_MS,
    };
    toggleCheckItem(press.item, peekDisableTakeFocusOnClick());
  };
  const handleScroll = (event: Event) => {
    if (heldScroll !== null && event.timeStamp < heldScroll.until) {
      restoreScrollTops(heldScroll.scrollTops);
    }
  };
  // What the last pointer press landed on, recorded in the capture-phase
  // handler that runs before the browser moves focus and consumed once the
  // gesture ends. A press on the item's content is the one that has to hand
  // focus back; a press on the check mark is how the plugin focuses the item
  // on purpose; and 'none' covers a click with no press behind it, which a
  // screen reader synthesizes on the focused item and which must not move
  // focus at all.
  let lastPress: 'checkMark' | 'content' | 'none' = 'none';
  const configHandleSelectDefaults = (event: PointerEvent | MouseEvent) => {
    lastPress = handleSelectDefaults(event, peekDisableTakeFocusOnClick())
      ? 'checkMark'
      : 'content';
  };
  const returnFocusAfterPress = () => {
    if (lastPress === 'content') {
      returnFocusToRoot(editor);
    }
    lastPress = 'none';
  };
  return mergeRegister(
    editor.registerCommand(
      INSERT_CHECK_LIST_COMMAND,
      () => {
        $insertList('check');
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      event => {
        return handleArrowUpOrDown(event, editor, false);
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      event => {
        return handleArrowUpOrDown(event, editor, true);
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        const activeItem = getActiveCheckListItem(editor);

        if (activeItem != null) {
          const rootElement = editor.getRootElement();

          if (rootElement != null) {
            rootElement.focus();
          }

          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_SPACE_COMMAND,
      event => {
        const activeItem = getActiveCheckListItem(editor);

        if (activeItem != null && editor.isEditable()) {
          editor.update(() => {
            const listItemNode = $getNearestNodeFromDOMNode(activeItem);

            if ($isListItemNode(listItemNode)) {
              event.preventDefault();
              listItemNode.toggleChecked();
            }
          });
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      event => {
        // The checkbox holds the focus already, so this arrow is the caret
        // moving rather than the checkbox being reached: back through the
        // label, or out of the item altogether when the caret is at its
        // start. Either way the editing host takes the focus back and the
        // caret moves as it normally would.
        if (getActiveCheckListItem(editor) !== null) {
          returnFocusToRoot(editor);
          return false;
        }

        return editor.read('latest', () => {
          const selection = $getSelection();

          if ($isRangeSelection(selection) && selection.isCollapsed()) {
            const {anchor} = selection;
            const isElement = anchor.type === 'element';

            if (isElement || anchor.offset === 0) {
              const anchorNode = anchor.getNode();
              const elementNode = $findMatchingParent(
                anchorNode,
                node => $isElementNode(node) && !node.isInline(),
              );
              if ($isListItemNode(elementNode)) {
                const parent = elementNode.getParent();
                if (
                  $isListNode(parent) &&
                  parent.getListType() === 'check' &&
                  (isElement || elementNode.getFirstDescendant() === anchorNode)
                ) {
                  const domNode = editor.getElementByKey(elementNode.__key);

                  // getActiveElement rather than document.activeElement, which
                  // reports the shadow host in a shadow root (so this would
                  // otherwise always re-focus and swallow the arrow key).
                  if (
                    domNode != null &&
                    getActiveElement(domNode) !== domNode
                  ) {
                    domNode.focus();
                    event.preventDefault();
                    return true;
                  }
                }
              }
            }
          }

          return false;
        });
      },
      COMMAND_PRIORITY_LOW,
    ),

    editor.registerRootListener(rootElement => {
      if (rootElement !== null) {
        return mergeRegister(
          // scroll does not bubble: capturing it on the document sees the
          // scrolling of any ancestor of the item.
          registerEventListeners(
            rootElement.ownerDocument,
            {scroll: handleScroll},
            {capture: true, passive: true},
          ),
          registerEventListeners(
            rootElement,
            {
              touchmove: handleTouchMove,
              touchstart: handleTouchStart,
            },
            {capture: true, passive: true},
          ),
          registerEventListeners(
            rootElement,
            {
              touchcancel: () => {
                touchPress = null;
              },
              touchend: handleTouchEnd,
            },
            {capture: true, passive: false},
          ),
          registerEventListeners(rootElement, {
            // Whichever of the two runs first consumes the press, before the
            // toggle it wraps focuses the item again for a check mark press.
            // pointerup also covers a gesture that never produces a click,
            // such as a right click opening the context menu.
            click: event => {
              returnFocusAfterPress();
              handleClick(event, peekDisableTakeFocusOnClick());
            },
            pointerup: returnFocusAfterPress,
          }),
          // Use capture so we run before other listeners that might move focus.
          // Some browsers / integrations still generate mousedown events as well
          // as pointerdown, so handle both.
          registerEventListeners(
            rootElement,
            {
              // Entering text moves the caret, which Chrome and Safari also
              // treat as handing focus back to the editing host. Capture so
              // the focus is right before the editor handles the input.
              beforeinput: () => returnFocusToRoot(editor),
              // Correcting the focus as soon as the browser moves it, rather
              // than waiting for the release, keeps the item from holding it
              // for the length of the press. Only Firefox: Chrome and Safari
              // hand the focus back themselves as part of placing the caret,
              // and stepping in before they do puts the caret at the start of
              // the item instead. A press on an item that already holds the
              // focus moves no focus at all and so arrives at neither of
              // these, which is what the release below is still there for.
              focusin: () => {
                if (IS_FIREFOX && lastPress === 'content') {
                  returnFocusToRoot(editor);
                }
              },
              // Every other key is the text being operated rather than the
              // checkbox, the caret-moving arrows above all: the caret leaves
              // the check mark behind, so the focus has to follow it. Text
              // entry arrives here too, but not all of it comes from a key,
              // which is why beforeinput covers that separately.
              keydown: event => {
                if (!CHECKBOX_KEYS.has(event.key)) {
                  returnFocusToRoot(editor);
                }
              },
              mousedown: configHandleSelectDefaults,
              pointerdown: configHandleSelectDefaults,
            },
            {capture: true},
          ),
        );
      }
    }),
  );
}

function handleCheckItemEvent(
  event: PointerEvent | MouseEvent,
  callback: (item: HTMLElement) => void,
) {
  const target = event.target;
  const isTouchEvent = 'pointerType' in event && event.pointerType === 'touch';

  if (isCheckMarkHit(target, event.clientX, isTouchEvent)) {
    callback(target);
  }
}

function isCheckMarkHit(
  target: EventTarget | null,
  clientX: number,
  isTouch: boolean,
): target is HTMLElement {
  if (!isHTMLElement(target)) {
    return false;
  }

  // Ignore clicks on LI that have nested lists
  const firstChild = target.firstChild;

  if (
    isHTMLElement(firstChild) &&
    (firstChild.tagName === 'UL' || firstChild.tagName === 'OL')
  ) {
    return false;
  }

  const parentNode = target.parentNode;

  // @ts-ignore internal field
  if (!parentNode || parentNode.__lexicalListType !== 'check') {
    return false;
  }
  const rect = target.getBoundingClientRect();
  const zoom = calculateZoomLevel(target);
  const clientXInPixels = clientX / zoom;

  // Use getComputedStyle if available, otherwise fallback to 0px width
  const targetView = target.ownerDocument.defaultView;
  const beforeStyles = targetView
    ? targetView.getComputedStyle(target, '::before')
    : ({width: '0px'} as CSSStyleDeclaration);
  const beforeWidthInPixels = parseFloat(beforeStyles.width);

  // Make click area slightly larger for touch devices to improve accessibility
  const clickAreaPadding = isTouch ? TOUCH_CLICK_AREA_PADDING : 0;

  return target.dir === 'rtl'
    ? clientXInPixels < rect.right + clickAreaPadding &&
        clientXInPixels > rect.right - beforeWidthInPixels - clickAreaPadding
    : clientXInPixels > rect.left - clickAreaPadding &&
        clientXInPixels < rect.left + beforeWidthInPixels + clickAreaPadding;
}

function handleClick(
  event: PointerEvent | MouseEvent,
  disableFocusOnClick: boolean,
) {
  handleCheckItemEvent(event, item =>
    toggleCheckItem(item, disableFocusOnClick),
  );
}

function toggleCheckItem(domNode: HTMLElement, disableFocusOnClick: boolean) {
  const editor = getNearestEditorFromDOMNode(domNode);

  if (editor != null && editor.isEditable()) {
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(domNode);

      if ($isListItemNode(node)) {
        if (disableFocusOnClick) {
          $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
          $addUpdateTag(SKIP_DOM_SELECTION_TAG);
        } else {
          domNode.focus();
        }
        node.toggleChecked();
      }
    });
  }
}

function getAncestorScrollTops(element: Element): ScrollTops {
  const scrollTops: ScrollTops = [];
  for (
    let ancestor = getParentElement(element);
    ancestor !== null;
    ancestor = getParentElement(ancestor)
  ) {
    scrollTops.push([ancestor, ancestor.scrollTop]);
  }
  return scrollTops;
}

function restoreScrollTops(scrollTops: ScrollTops): void {
  for (const [element, scrollTop] of scrollTops) {
    if (element.scrollTop !== scrollTop) {
      element.scrollTop = scrollTop;
    }
  }
}

/**
 * Prevents default focus switch behavior
 *
 * @param event might be of type PointerEvent or MouseEvent, hence the generic Event type
 *
 */
function handleSelectDefaults(
  event: PointerEvent | MouseEvent,
  disableTakeFocusOnClick: boolean,
): boolean {
  let isCheckMarkPress = false;

  handleCheckItemEvent(event, () => {
    isCheckMarkPress = true;
    // Prevents caret moving when clicking on check mark.
    event.preventDefault();
    if (disableTakeFocusOnClick) {
      event.stopPropagation();
    }
  });

  return isCheckMarkPress;
}

// A check list item carries tabIndex="-1" so the plugin can hand it focus for
// its checkbox role, which also makes it the nearest focusable ancestor of the
// caret. Pressing the mouse in the item's text therefore focuses the item, and
// a focused item is what the key handlers read as "the checkbox is what the
// keyboard is operating", so Space toggled the item instead of typing a space
// (#4680). Chrome and Safari hand focus back to the root once they are done
// with the press; this does the same in every browser, at the end of the
// gesture so the press has finished placing the caret first.
function returnFocusToRoot(editor: LexicalEditor): void {
  const rootElement = editor.getRootElement();
  const activeElement = rootElement ? getActiveElement(rootElement) : null;

  if (
    rootElement !== null &&
    isHTMLElement(activeElement) &&
    isCheckListItem(activeElement)
  ) {
    rootElement.focus({preventScroll: true});
  }
}

function isCheckListItem(dom: HTMLElement): boolean {
  const parentNode = dom.parentNode;

  return (
    dom.tagName === 'LI' &&
    parentNode != null &&
    // @ts-ignore internal field
    parentNode.__lexicalListType === 'check'
  );
}

function getActiveCheckListItem(editor: LexicalEditor): HTMLElement | null {
  // getActiveElement scoped to the editor's root rather than
  // document.activeElement, which reports the shadow host when the editor is
  // in a shadow root (so the focused <li> would otherwise be invisible here).
  const rootElement = editor.getRootElement();
  const activeElement = rootElement ? getActiveElement(rootElement) : null;

  return isHTMLElement(activeElement) && isCheckListItem(activeElement)
    ? activeElement
    : null;
}

function findCheckListItemSibling(
  node: ListItemNode,
  backward: boolean,
): ListItemNode | null {
  let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();
  let parent: ElementNode | null = node;

  // Going up in a tree to get non-null sibling
  while (sibling == null && $isListItemNode(parent)) {
    // Get li -> parent ul/ol -> parent li
    parent = parent.getParentOrThrow().getParent();

    if (parent != null) {
      sibling = backward
        ? parent.getPreviousSibling()
        : parent.getNextSibling();
    }
  }

  // Going down in a tree to get first non-nested list item
  while ($isListItemNode(sibling)) {
    const firstChild = backward
      ? sibling.getLastChild()
      : sibling.getFirstChild();

    if (!$isListNode(firstChild)) {
      return sibling;
    }

    sibling = backward ? firstChild.getLastChild() : firstChild.getFirstChild();
  }

  return null;
}

function handleArrowUpOrDown(
  event: KeyboardEvent,
  editor: LexicalEditor,
  backward: boolean,
) {
  const activeItem = getActiveCheckListItem(editor);

  if (activeItem != null) {
    let nextItemKey: null | NodeKey = null;

    editor.update(
      () => {
        const listItem = $getNearestNodeFromDOMNode(activeItem);

        if (!$isListItemNode(listItem)) {
          return;
        }

        const nextListItem = findCheckListItemSibling(listItem, backward);

        if (nextListItem != null) {
          nextListItem.selectStart();

          if (editor.getElementByKey(nextListItem.__key) != null) {
            event.preventDefault();
            nextItemKey = nextListItem.__key;
          }
        }
      },
      {
        // The focus has to land after the reconciler has moved the selection
        // onto the next item, which is what onUpdate is for. The element is
        // resolved from the key here rather than captured above, so a
        // reconciliation that replaced it is followed to the current one.
        onUpdate: () => {
          const dom =
            nextItemKey === null ? null : editor.getElementByKey(nextItemKey);

          if (dom != null) {
            dom.focus();
          }
        },
      },
    );
  }

  return false;
}
