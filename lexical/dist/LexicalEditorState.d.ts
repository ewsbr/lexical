/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor.js';
import type { NodeMap, ParsableSerializedNode, SerializedPartial } from './LexicalNode.js';
import type { BaseSelection } from './LexicalSelection.js';
import { type SerializedRootNode } from './nodes/LexicalRootNode.js';
export interface SerializedEditorState {
    root: SerializedRootNode;
}
/**
 * A document written in the compact form, which omits from every node the
 * properties parsing restores on its own. The two forms describe the same
 * document, and both parse; this one is smaller and can only be read by a
 * Lexical new enough to restore what it left out.
 *
 * Distinct from {@link SerializedEditorState} because the shapes differ:
 * a property the form omitted is absent, so promising the full type would
 * promise values that are not there.
 */
export interface CompactSerializedEditorState {
    root: SerializedPartial<SerializedRootNode>;
}
/**
 * A document as a structural subtree — what {@link $parseSerializedNode}
 * accepts at every level — for a caller holding serialized nodes rather than
 * a `SerializedEditorState`: `@lexical/clipboard`'s `BaseSerializedNode[]`
 * from `$generateJSONFromSelectedNodes`, whose `version` is optional and whose
 * interface carries no index signature, matched neither of the two forms
 * above and could not be handed back to `parseEditorState` without a cast.
 */
export interface ParsableSerializedEditorState {
    root: ParsableSerializedNode;
}
export declare function editorStateHasDirtySelection(editorState: EditorState, editor: LexicalEditor): boolean;
export declare function cloneEditorState(current: EditorState): EditorState;
export declare function createEmptyEditorState(): EditorState;
export interface EditorStateReadOptions {
    editor?: LexicalEditor | null;
}
/**
 * Type guard that returns true if the argument is an EditorState
 */
export declare function $isEditorState(x: unknown): x is EditorState;
export declare class EditorState {
    _nodeMap: NodeMap;
    _selection: null | BaseSelection;
    _flushSync: boolean;
    _readOnly: boolean;
    /**
     * True if this EditorState was parsed without running transforms
     */
    _parsed: boolean;
    /**
     * True if this EditorState or the LexicalEditor that created it has
     * ever used slots
     */
    _slotsUsed: boolean;
    constructor(nodeMap: NodeMap, selection?: null | BaseSelection, slotsUsed?: boolean);
    isEmpty(): boolean;
    read<V>(callbackFn: () => V, options?: EditorStateReadOptions): V;
    clone(selection?: null | BaseSelection): EditorState;
    /**
     * This document's JSON, in the legacy form that writes every property.
     *
     * The form is this call's to state, never inherited: called with no argument
     * — including by `JSON.stringify`, for which this is the `toJSON` hook — it
     * writes the legacy form whatever {@link $withCompactExport} encloses it.
     * That is what makes this signature true, and it is the behavior that
     * predates the compact form.
     *
     * A nested editor still follows the document containing it, because
     * {@link LexicalEditor.toJSON} passes the enclosing form on explicitly
     * rather than leaving it to be picked up here.
     */
    toJSON(compact?: false): SerializedEditorState;
    /**
     * @param compact Write the compact form, which omits from every node the
     *   properties parsing restores on its own. Passing the form here rather
     *   than through an enclosing {@link $withCompactExport} is what lets the
     *   return type say which shape it is.
     */
    toJSON(compact: boolean): CompactSerializedEditorState;
}
