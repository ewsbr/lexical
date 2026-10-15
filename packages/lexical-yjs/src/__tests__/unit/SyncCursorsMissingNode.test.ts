/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  type Binding,
  createBinding,
  initLocalState,
  type Provider,
  type ProviderAwareness,
  type SyncCursorPositionsFn,
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
  type UserState,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  createEditor,
  type LexicalEditor,
  SKIP_COLLAB_TAG,
} from 'lexical';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import * as Y from 'yjs';

// Origin used when relaying an update into a peer doc, so the relayed update is
// never echoed back to its sender.
const RELAY_ORIGIN = Symbol('relay');

// Cursor rendering needs real layout, which nothing under test depends on.
const noopSyncCursorPositions: SyncCursorPositionsFn = () => {};

interface TestClient {
  binding: Binding;
  doc: Y.Doc;
  editor: LexicalEditor;
  errors: Error[];
  provider: Provider;
}

// Cross-client updates are queued and flushed from the top of the test stack,
// as a real provider delivers them on a fresh event-loop callback.
let pendingDeliveries: (() => void)[] = [];
let cleanups: (() => void)[] = [];

async function synchronize(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    while (pendingDeliveries.length > 0) {
      const deliveries = pendingDeliveries;
      pendingDeliveries = [];
      for (const deliver of deliveries) {
        deliver();
      }
    }
    await Promise.resolve();
  }
}

function createAwareness(doc: Y.Doc): ProviderAwareness {
  let localState: UserState | null = null;
  return {
    getLocalState: () => localState,
    getStates: () => {
      const states = new Map<number, UserState>();
      if (localState !== null) {
        states.set(doc.clientID, localState);
      }
      return states;
    },
    off: () => {},
    on: () => {},
    setLocalState: state => {
      localState = state;
    },
    setLocalStateField: (field, value) => {
      if (localState !== null) {
        localState = {...localState, [field]: value};
      }
    },
  };
}

function createClient(name: string): TestClient {
  const doc = new Y.Doc({gc: false});
  const provider = {
    awareness: createAwareness(doc),
    connect: () => {},
    disconnect: () => {},
    off: () => {},
    on: () => {},
  } as unknown as Provider;
  // Errors are collected rather than thrown: the one under test is raised
  // inside the update that applies a remote change.
  const errors: Error[] = [];
  const editor = createEditor({
    namespace: 'collab-missing-node',
    onError: error => {
      errors.push(error);
    },
  });
  const binding = createBinding(
    editor,
    provider,
    'main',
    doc,
    new Map([['main', doc]]),
  );

  const removeUpdateListener = editor.registerUpdateListener(
    ({
      prevEditorState,
      editorState,
      dirtyElements,
      dirtyLeaves,
      normalizedNodes,
      tags,
    }) => {
      if (!tags.has(SKIP_COLLAB_TAG)) {
        syncLexicalUpdateToYjs(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        );
      }
    },
  );

  const sharedType = binding.root.getSharedType();
  const onYjsTreeChanges = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: Y.YEvent<any>[],
    transaction: Y.Transaction,
  ) => {
    if (transaction.origin !== binding) {
      syncYjsChangesToLexical(
        binding,
        provider,
        events,
        false,
        noopSyncCursorPositions,
      );
    }
  };
  sharedType.observeDeep(onYjsTreeChanges);
  initLocalState(provider, name, '#ff0000', true, {});

  cleanups.push(() => {
    removeUpdateListener();
    sharedType.unobserveDeep(onYjsTreeChanges);
    doc.destroy();
  });

  return {binding, doc, editor, errors, provider};
}

function connect(clients: TestClient[]): void {
  for (const client of clients) {
    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === RELAY_ORIGIN) {
        return;
      }
      for (const other of clients) {
        if (other !== client) {
          pendingDeliveries.push(() =>
            Y.applyUpdate(other.doc, update, RELAY_ORIGIN),
          );
        }
      }
    };
    client.doc.on('update', onUpdate);
    cleanups.push(() => client.doc.off('update', onUpdate));
  }
}

function edit(editor: LexicalEditor, fn: () => void): void {
  editor.update(fn, {discrete: true});
}

describe('SyncCursors local cursor on a node the sync removed', () => {
  let local: TestClient;
  let remote: TestClient;

  beforeEach(() => {
    pendingDeliveries = [];
    local = createClient('Local');
    remote = createClient('Remote');
    connect([local, remote]);
  });

  afterEach(() => {
    for (let i = cleanups.length - 1; i >= 0; i--) {
      cleanups[i]();
    }
    cleanups = [];
    pendingDeliveries = [];
  });

  test('keeps a usable selection when a concurrent split empties the caret’s text node', async () => {
    edit(remote.editor, () => {
      $getRoot().append(
        $createParagraphNode().append($createTextNode('epsilon')),
      );
    });
    await synchronize();

    // The collaborator moves "ilon" into a paragraph of its own and edits it
    // there, while the local user deletes "eps", leaving the caret at the start
    // of what remains of the word in the first paragraph.
    edit(remote.editor, () => {
      $getRoot().getAllTextNodes()[0].select(3, 3).insertParagraph();
    });
    edit(remote.editor, () => {
      $getRoot().getAllTextNodes()[1].select(0, 1).removeText();
    });
    edit(local.editor, () => {
      $getRoot().getAllTextNodes()[0].select(0, 3).removeText();
    });

    // Merged, the first paragraph is empty. The local caret's relative position
    // resolves to the collab text node of the emptied text, whose Lexical node
    // the same sync removed.
    await synchronize();

    expect(local.errors.map(error => error.message)).toEqual([]);
    expect(local.editor.read(() => $getRoot().getTextContent())).toBe(
      remote.editor.read(() => $getRoot().getTextContent()),
    );
    const selectionNodesAttached = local.editor.read(() => {
      const selection = $getSelection();
      return (
        $isRangeSelection(selection) &&
        [selection.anchor.key, selection.focus.key].every(
          key => $getNodeByKey(key)?.isAttached() === true,
        )
      );
    });
    expect(selectionNodesAttached).toBe(true);
  });
});
