/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  CheckListExtension,
} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {$getRoot} from 'lexical';
import {invariant} from 'lexical/src/__tests__/utils';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

describe('CheckListExtension mobile tap toggle', () => {
  // jsdom does not implement getComputedStyle with pseudo-elements
  // (https://github.com/jsdom/jsdom/issues/1928), but the checklist
  // hit-test reads the ::before width to size the marker area. Stub a
  // 16px width so the bounds check resolves to a concrete number.
  const originalGetComputedStyle = window.getComputedStyle;
  beforeAll(() => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element: Element, pseudoElement?: string | null) => {
        if (pseudoElement === '::before') {
          return {width: '16px'} as unknown as CSSStyleDeclaration;
        }
        return originalGetComputedStyle.call(window, element, pseudoElement);
      },
    );
    // Nor elementFromPoint, which a touch uses to find the item its padding
    // reaches from beside it. Nothing lies beside the item unless a test says
    // so.
    document.elementFromPoint = () => null;
  });
  afterAll(() => {
    vi.restoreAllMocks();
    // @ts-expect-error jsdom has no elementFromPoint of its own to restore
    delete document.elementFromPoint;
  });

  const checkListExtension = defineExtension({
    $initialEditorState: () => {
      const list = $createListNode('check');
      list.append($createListItemNode(false));
      list.append($createListItemNode(false));
      $getRoot().append(list);
    },
    dependencies: [CheckListExtension, RichTextExtension],
    name: '[checklist-test]',
  });

  let container: HTMLDivElement;
  let rootElement: HTMLDivElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    container.appendChild(rootElement);
  });
  afterEach(() => {
    document.body.removeChild(container);
  });

  function buildEditor() {
    const editor = buildEditorFromExtensions(checkListExtension);
    editor.setRootElement(rootElement);
    return editor;
  }

  function getCheckListItem(index = 0): HTMLLIElement {
    const items = rootElement.querySelectorAll('li');
    const li = items[index];
    invariant(li !== undefined, `No <li> at index ${index}`);
    return li as HTMLLIElement;
  }

  function readChecked(
    editor: ReturnType<typeof buildEditor>,
    index: number,
  ): boolean {
    return editor.read(() => {
      const list = $getRoot().getFirstChildOrThrow();
      invariant($isListNode(list), 'Expected a ListNode at root');
      const item = list.getChildAtIndex(index);
      invariant($isListItemNode(item), `Expected ListItemNode at ${index}`);
      return item.getChecked() === true;
    });
  }

  // jsdom cannot construct Touch objects, so the touch lists are stubbed.
  function dispatchTouch(
    target: EventTarget,
    type: 'touchstart' | 'touchmove' | 'touchend',
    clientX: number,
    clientY = 5,
  ): Event {
    const touch = {clientX, clientY};
    const event = new Event(type, {bubbles: true, cancelable: true});
    Object.defineProperties(event, {
      changedTouches: {value: [touch]},
      touches: {value: type === 'touchend' ? [] : [touch]},
    });
    target.dispatchEvent(event);
    return event;
  }

  it('a tap on the marker toggles the item once, canceling the pointerdown and touchend but not the touchstart', () => {
    using editor = buildEditor();
    const li = getCheckListItem(0);
    const dispatchPointer = (type: string) => {
      const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 5,
        pointerType: 'touch',
      });
      li.dispatchEvent(event);
      return event;
    };

    const pointerDown = dispatchPointer('pointerdown');
    const touchStart = dispatchTouch(li, 'touchstart', 10);
    dispatchPointer('pointerup');
    const touchEnd = dispatchTouch(li, 'touchend', 10);

    // The canceled pointerdown and touchend keep the caret, the keyboard and
    // the click away; a canceled touchstart would keep a swipe from scrolling.
    expect(pointerDown.defaultPrevented).toBe(true);
    expect(touchStart.defaultPrevented).toBe(false);
    expect(touchEnd.defaultPrevented).toBe(true);
    expect(readChecked(editor, 0)).toBe(true);
  });

  it('a tap whose finger drifts within the slop still toggles', () => {
    using editor = buildEditor();
    const li = getCheckListItem(0);

    dispatchTouch(li, 'touchstart', 10, 5);
    dispatchTouch(li, 'touchmove', 14, 15);
    dispatchTouch(li, 'touchend', 14, 15);

    expect(readChecked(editor, 0)).toBe(true);
  });

  it('a swipe from the marker toggles nothing and leaves the touchend alone', () => {
    using editor = buildEditor();
    const li = getCheckListItem(0);

    dispatchTouch(li, 'touchstart', 10, 5);
    dispatchTouch(li, 'touchmove', 10, -40);
    const touchEnd = dispatchTouch(li, 'touchend', 10, -40);

    expect(touchEnd.defaultPrevented).toBe(false);
    expect(readChecked(editor, 0)).toBe(false);
  });

  // jsdom has no layout: the root spans 0 to 300 and the item sits at 0, so
  // what lies at any x from 0 on is the item.
  function tapWithLayout(target: EventTarget, clientX: number) {
    const li = getCheckListItem(0);
    const rootRect = vi
      .spyOn(rootElement, 'getBoundingClientRect')
      .mockReturnValue({bottom: 100, left: 0, right: 300, top: 0} as DOMRect);
    const elementFromPoint = vi
      .spyOn(document, 'elementFromPoint')
      .mockImplementation(x => (x >= 0 ? li : null));
    try {
      dispatchTouch(target, 'touchstart', clientX);
      dispatchTouch(target, 'touchend', clientX);
    } finally {
      elementFromPoint.mockRestore();
      rootRect.mockRestore();
    }
  }

  it('a tap beside the item, within the touch padding, toggles it', () => {
    using editor = buildEditor();

    // A touch at -20 lands on whatever lies to the item's left.
    tapWithLayout(container, -20);

    expect(readChecked(editor, 0)).toBe(true);
  });

  it("a tap on the item's content within the touch padding does not toggle it", () => {
    using editor = buildEditor();

    // 20 is past the 16px marker, on the content (a text node in a real
    // item, the container here).
    tapWithLayout(container, 20);

    expect(readChecked(editor, 0)).toBe(false);
  });
});
