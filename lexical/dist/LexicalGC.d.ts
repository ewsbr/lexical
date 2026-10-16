/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor.js';
import type { EditorState } from './LexicalEditorState.js';
import type { NodeKey } from './LexicalNode.js';
export declare function $garbageCollectDetachedDecorators(editor: LexicalEditor, pendingEditorState: EditorState): void;
type IntentionallyMarkedAsDirtyElement = boolean;
export declare function $garbageCollectDetachedNodes(prevEditorState: EditorState, editorState: EditorState, dirtyLeaves: Set<NodeKey>, dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>): void;
export {};
