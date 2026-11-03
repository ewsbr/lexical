/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node
import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  createBindingV2__EXPERIMENTAL,
  type Provider,
  type ProviderAwareness,
  syncCursorPositions,
  type UserState,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  defineExtension,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {afterEach, describe, expect, test} from 'vitest';
import {Doc} from 'yjs';

const PEER_CLIENT_ID = 1;

describe('syncCursorPositions', () => {
  let editor: LexicalEditorWithDispose | undefined;
  afterEach(() => {
    editor?.dispose();
    editor = undefined;
  });

  // An awareness listener can run in the middle of an update: an update that
  // moves the DOM focus, as a check list item's click does, blurs the root
  // element there, and a blur handler that publishes the local caret makes
  // the provider notify its listeners at once.
  test('leaves an update in progress to finish', () => {
    editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[sync-cursors-during-update]',
      }),
    );
    const doc = new Doc();
    const binding = createBindingV2__EXPERIMENTAL(
      editor,
      'sync-cursors-during-update',
      doc,
      new Map([['sync-cursors-during-update', doc]]),
    );
    const peer: UserState = {
      anchorPos: null,
      awarenessData: {},
      color: '#000000',
      focusPos: null,
      focusing: true,
      name: 'peer',
    };
    const provider = {
      awareness: {
        getLocalState: () => null,
        getStates: () => new Map([[PEER_CLIENT_ID, peer]]),
        off: () => {},
        on: () => {},
        setLocalState: () => {},
        setLocalStateField: () => {},
      } as unknown as ProviderAwareness,
    } as unknown as Provider;
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode('text')))
          .selectEnd();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        syncCursorPositions(binding, provider);
        $assertNodeType($getRoot().getFirstChild(), $isElementNode).append(
          $createTextNode(' more'),
        );
      },
      {discrete: true},
    );

    expect(editor.read(() => $getRoot().getTextContent())).toBe('text more');
  });
});
