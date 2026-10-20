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
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  defineExtension,
  type ElementNode,
} from 'lexical';
import {afterEach, assert, describe, expect, test} from 'vitest';
import {applyUpdate, Doc, UndoManager, XmlElement} from 'yjs';

describe('collab-v2 element identity', () => {
  const editors: LexicalEditorWithDispose[] = [];
  afterEach(() => {
    for (const editor of editors) {
      editor.dispose();
    }
    editors.length = 0;
  });

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
    inbox: Uint8Array[];
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
    return {binding, editor, inbox: []};
  }

  /** Two peers with paragraphs a, b, c; `live` false holds updates in the inboxes. */
  function createPeers() {
    const a = createPeer('a');
    const b = createPeer('b');
    const sync = {live: true};
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      from.binding.doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin === 'remote') {
          return;
        }
        if (sync.live) {
          applyUpdate(to.binding.doc, update, 'remote');
        } else {
          to.inbox.push(update);
        }
      });
    }
    a.editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            ...['a', 'b', 'c'].map(text =>
              $createParagraphNode().append($createTextNode(text)),
            ),
          );
      },
      {discrete: true},
    );
    return {a, b, sync};
  }

  const $paragraph = (text: string): ElementNode => {
    const paragraph = $getRoot()
      .getChildren()
      .find(node => node.getTextContent() === text);
    assert($isElementNode(paragraph), `no paragraph "${text}"`);
    return paragraph;
  };

  const texts = (editor: LexicalEditorWithDispose) =>
    editor.read(() =>
      $getRoot()
        .getChildren()
        .map(node => node.getTextContent()),
    );

  test('a paragraph removed in the update that inserts one beside it has its element deleted', () => {
    const {a, b} = createPeers();
    const [, removed] = a.binding.root.toArray();
    assert(removed instanceof XmlElement);
    const removedKey = b.editor.read(() => $paragraph('b').getKey());

    a.editor.update(
      () => {
        $paragraph('a').insertAfter(
          $createParagraphNode().append($createTextNode('new')),
        );
        $paragraph('b').remove();
      },
      {discrete: true},
    );

    expect(a.binding.root.toArray()).not.toContain(removed);
    expect(removed._item?.deleted).toBe(true);
    expect(texts(b.editor)).toEqual(['a', 'new', 'c']);
    b.editor.read(() => {
      expect($paragraph('new').getKey()).not.toBe(removedKey);
    });
  });

  test("moving a paragraph past its neighbour keeps the neighbour's element, with a peer's concurrent edit of it", () => {
    const {a, b, sync} = createPeers();
    const [, moved, neighbour] = a.binding.root.toArray();
    sync.live = false;
    a.editor.update(
      () => {
        $paragraph('c').insertAfter($paragraph('b'));
      },
      {discrete: true},
    );
    b.editor.update(
      () => {
        const text = $paragraph('c').getFirstDescendant();
        assert($isTextNode(text));
        text.setTextContent('c typed');
      },
      {discrete: true},
    );
    sync.live = true;
    for (const peer of [a, b]) {
      for (const update of peer.inbox.splice(0)) {
        applyUpdate(peer.binding.doc, update, 'remote');
      }
    }

    const elements = a.binding.root.toArray();
    expect(elements[1]).toBe(neighbour);
    expect(elements).not.toContain(moved);
    expect(texts(a.editor)).toEqual(['a', 'c typed', 'b']);
    expect(texts(b.editor)).toEqual(['a', 'c typed', 'b']);
  });
});
