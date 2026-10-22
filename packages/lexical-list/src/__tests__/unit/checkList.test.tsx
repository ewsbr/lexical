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
  });
  afterAll(() => {
    vi.restoreAllMocks();
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
    const event = new Event(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    Object.defineProperties(event, {
      changedTouches: {value: [touch]},
      touches: {value: type === 'touchend' ? [] : [touch]},
    });
    target.dispatchEvent(event);
    return event;
  }

  it('a tap on the marker toggles the item once and cancels the touchend but not the touchstart', () => {
    using editor = buildEditor();
    const li = getCheckListItem(0);

    const touchStart = dispatchTouch(li, 'touchstart', 10);
    const touchEnd = dispatchTouch(li, 'touchend', 10);
    // The click a canceled touchend would have sent toggles nothing more.
    expect(touchEnd.defaultPrevented).toBe(true);
    expect(touchStart.defaultPrevented).toBe(false);
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

  it('taps on two different items toggle both', () => {
    using editor = buildEditor();

    for (const index of [0, 1]) {
      const li = getCheckListItem(index);
      dispatchTouch(li, 'touchstart', 10);
      dispatchTouch(li, 'touchend', 10);
    }

    expect(readChecked(editor, 0)).toBe(true);
    expect(readChecked(editor, 1)).toBe(true);
  });

  it('mouse pointerup is ignored (click stays the desktop path)', () => {
    using editor = buildEditor();
    expect(readChecked(editor, 0)).toBe(false);

    const li = getCheckListItem(0);
    li.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 5,
        pointerType: 'mouse',
      }),
    );

    expect(readChecked(editor, 0)).toBe(false);
  });

  it('rapid mouse clicks on the same item all toggle (desktop not throttled)', () => {
    using editor = buildEditor();
    expect(readChecked(editor, 0)).toBe(false);

    const baseTimeStamp = 1000;
    const click = (offsetMs: number) => {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 5,
      });
      Object.defineProperty(event, 'timeStamp', {
        value: baseTimeStamp + offsetMs,
      });
      getCheckListItem(0).dispatchEvent(event);
    };

    // Two rapid mouse clicks within the dedup window must both toggle.
    click(0);
    click(100);

    expect(readChecked(editor, 0)).toBe(false);
  });

  it('a tap on the marker of an editor in a shadow root toggles the item', () => {
    // After its dispatch, the touchstart no longer has its target.
    const host = document.createElement('div');
    container.appendChild(host);
    host.attachShadow({mode: 'open'}).appendChild(rootElement);
    using editor = buildEditor();
    const li = getCheckListItem(0);

    dispatchTouch(li, 'touchstart', 10);
    dispatchTouch(li, 'touchend', 10);

    expect(readChecked(editor, 0)).toBe(true);
  });
});
