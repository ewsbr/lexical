/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
} from 'lexical';
import {
  afterEach,
  assert,
  beforeEach,
  expect,
  onTestFinished,
  test,
  vi,
} from 'vitest';

const environment = vi.hoisted(() => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: false,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: false,
  IS_FIREFOX: true,
  IS_IOS: false,
  IS_SAFARI: false,
}));

vi.mock('lexical/src/environment', () => environment);

beforeEach(() => {
  vi.useFakeTimers();
  Object.assign(environment, {
    IS_APPLE: false,
    IS_APPLE_WEBKIT: false,
    IS_FIREFOX: true,
    IS_IOS: false,
    IS_SAFARI: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

function mountEditor(text: string) {
  const container = document.createElement('div');
  container.contentEditable = 'true';
  document.body.appendChild(container);
  const editor = buildEditorFromExtensions({
    $initialEditorState: () => {
      const node = $createTextNode(text);
      $getRoot().append($createParagraphNode().append(node));
      node.selectEnd();
    },
    dependencies: [RichTextExtension],
    name: 'test',
  });
  editor.setRootElement(container);
  onTestFinished(() => {
    editor.dispose();
    container.remove();
  });
  return {container, editor};
}

function input(container: HTMLElement, data: string) {
  container.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data,
      inputType: 'insertCompositionText',
      isComposing: true,
    }),
  );
}

test('Firefox recreates normalized composition text after an empty dead-key update (#8701)', () => {
  const {container, editor} = mountEditor('`');
  container.dispatchEvent(
    new CompositionEvent('compositionstart', {bubbles: true, data: ''}),
  );
  expect(editor.isComposing()).toBe(true);

  const domText = container.querySelector('span')!.firstChild!;
  domText.textContent = '';
  window.getSelection()!.collapse(domText, 0);
  container.dispatchEvent(
    new CompositionEvent('compositionupdate', {bubbles: true, data: ''}),
  );
  input(container, '');

  editor.read(() => {
    expect($getRoot().getTextContent()).toBe('');
    const selection = $getSelection();
    assert($isRangeSelection(selection));
    expect(selection.anchor.type).toBe('element');
  });
  expect(editor.isComposing()).toBe(false);

  // Normalization removed the mergeable text node. Firefox repopulates a
  // new DOM span before the delayed deletion from the empty update runs.
  const span = document.createElement('span');
  span.textContent = '``';
  container.firstChild!.appendChild(span);
  window.getSelection()!.collapse(span.firstChild!, 2);
  input(container, '``');

  editor.read(() => expect($getRoot().getTextContent()).toBe('``'));
  vi.runOnlyPendingTimers();
  editor.read(() => expect($getRoot().getTextContent()).toBe('``'));
  expect(container.textContent).toBe('``');
});

test('iOS Safari does not duplicate composition text after Bold (#8755)', () => {
  Object.assign(environment, {
    IS_APPLE: true,
    IS_APPLE_WEBKIT: true,
    IS_FIREFOX: false,
    IS_IOS: true,
    IS_SAFARI: true,
  });
  const {container, editor} = mountEditor('あ');
  container.dispatchEvent(
    new CompositionEvent('compositionstart', {bubbles: true, data: ''}),
  );
  expect(editor.isComposing()).toBe(true);
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  editor.read(() => {
    const selection = $getSelection();
    assert($isRangeSelection(selection));
    expect(selection.anchor.type).toBe('text');
    expect(selection.hasFormat('bold')).toBe(true);
  });
  expect(editor.isComposing()).toBe(false);

  // The browser commits into the existing DOM despite formatting having
  // cleared Lexical's composition key. Inserting again would duplicate it.
  const domText = container.querySelector('span')!.firstChild!;
  domText.textContent = 'あい';
  window.getSelection()!.collapse(domText, 2);
  input(container, 'あい');
  editor.read(() => expect($getRoot().getTextContent()).toBe('あい'));

  container.dispatchEvent(
    new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: 'あい',
      inputType: 'insertFromComposition',
    }),
  );
  editor.read(() => expect($getRoot().getTextContent()).toBe('あい'));
  expect(container.textContent).toBe('あい');
});
