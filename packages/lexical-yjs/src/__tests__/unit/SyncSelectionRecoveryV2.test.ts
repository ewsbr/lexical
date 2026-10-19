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
  type BindingV2,
  createBindingV2__EXPERIMENTAL,
  type Provider,
  type ProviderAwareness,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  defineExtension,
  type ParagraphNode,
} from 'lexical';
import {afterEach, assert, describe, expect, test} from 'vitest';
import {applyUpdate, Doc, UndoManager} from 'yjs';

describe('collab-v2 selection recovery', () => {
  const editors: LexicalEditorWithDispose[] = [];
  afterEach(() => {
    for (const editor of editors) {
      editor.dispose();
    }
    editors.length = 0;
  });

  // No local awareness state, so the caret cannot be restored from its Yjs
  // relative position and recovery has to work from the Lexical selection.
  const provider = {
    awareness: {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: () => {},
      on: () => {},
      setLocalState: () => {},
      setLocalStateField: () => {},
    } as ProviderAwareness,
  } as unknown as Provider;

  function createPeer(name: string): {
    binding: BindingV2;
    editor: LexicalEditorWithDispose;
  } {
    const editor = buildEditorFromExtensions(
      defineExtension({$initialEditorState: null, name}),
    );
    editors.push(editor);
    const doc = new Doc();
    const binding = createBindingV2__EXPERIMENTAL(
      editor,
      name,
      doc,
      new Map([[name, doc]]),
    );
    binding.root.observeDeep((events, transaction) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToLexicalV2__EXPERIMENTAL(
          binding,
          provider,
          events as Parameters<
            typeof syncYjsChangesToLexicalV2__EXPERIMENTAL
          >[2],
          transaction,
          transaction.origin instanceof UndoManager,
        );
      }
    });
    editor.registerUpdateListener(
      ({
        dirtyElements,
        dirtyLeaves,
        editorState,
        normalizedNodes,
        prevEditorState,
        tags,
      }) => {
        syncLexicalUpdateToYjsV2__EXPERIMENTAL(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        );
      },
    );
    return {binding, editor};
  }

  test('an element point past the children a remote change left is moved to the element end', () => {
    const a = createPeer('a');
    const b = createPeer('b');
    a.binding.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'b') {
        applyUpdate(b.binding.doc, update, 'a');
      }
    });
    b.binding.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'a') {
        applyUpdate(a.binding.doc, update, 'b');
      }
    });

    let paragraphKey = '';
    a.editor.update(
      () => {
        const paragraph = $createParagraphNode().append(
          $createTextNode('a'),
          $createTextNode('b').setFormat('bold'),
          $createTextNode('c'),
        );
        $getRoot().clear().append(paragraph);
        paragraphKey = paragraph.getKey();
        const selection = $createRangeSelection();
        selection.anchor.set(paragraphKey, 3, 'element');
        selection.focus.set(paragraphKey, 3, 'element');
        $setSelection(selection);
      },
      {discrete: true},
    );

    // Unbolding 'b' merges the three text nodes into one, and peer a replaces
    // its paragraph's children to match.
    b.editor.update(
      () => {
        const bold = $getRoot()
          .getAllTextNodes()
          .find(node => $isTextNode(node) && node.hasFormat('bold'));
        assert(bold !== undefined);
        bold.setFormat(0);
      },
      {discrete: true},
    );

    a.editor.read(() => {
      const paragraph = $getRoot().getFirstChildOrThrow<ParagraphNode>();
      expect(paragraph.getKey()).toBe(paragraphKey);
      expect(paragraph.getTextContent()).toBe('abc');
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      for (const point of [selection.anchor, selection.focus]) {
        const node = point.getNode();
        expect(node.isAttached()).toBe(true);
        expect(point.offset).toBeLessThanOrEqual(
          point.type === 'element'
            ? paragraph.getChildrenSize()
            : node.getTextContentSize(),
        );
      }
      expect(selection.anchor.key).toBe(paragraphKey);
      expect(selection.anchor.offset).toBe(paragraph.getChildrenSize());
    });
  });
});
