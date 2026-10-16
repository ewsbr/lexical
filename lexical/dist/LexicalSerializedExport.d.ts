/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalNode, SerializedLexicalNode, SerializedPartial } from './LexicalNode.js';
/**
 * Run `f` writing the compact form of the document (or, with `false`, the
 * legacy form), for any export it performs: the `@lexical/clipboard` selection
 * export, a serialization walk of your own, and the nested editors those
 * serialize. A whole document states its form at the call site instead —
 * `editorState.toJSON(true)` — which is what lets its return type say which
 * shape it is; this is for the walks that have no such argument to take.
 *
 * The compact form omits every property parsing would restore anyway — one
 * whose value is its schema default, one the parser derives rather than reads,
 * and the deprecated `version` — so the two forms describe the same document.
 * It can only be read by a Lexical new enough to restore them, so keep writing
 * the legacy form until every reader is upgraded.
 *
 * `f` must be synchronous. The form is restored as soon as it returns, so an
 * `async` callback would give up the form at its first `await` and export in
 * whatever form is ambient when it resumes. A callback whose return type is a
 * promise is rejected at the call site by the trailing parameter, which is an
 * empty tuple for every other type; the runtime check behind it is for an
 * untyped caller, and runs in every build, because the failure it catches is a
 * document written in the wrong form rather than a degraded experience.
 *
 * @example
 * ```ts
 * const selectionJSON = $withCompactExport(true, () =>
 *   $generateJSONFromSelectedNodes(editor, $getSelection()),
 * );
 * ```
 *
 * @experimental
 */
export declare function $withCompactExport<T>(compact: boolean, f: () => T, ...reject: T extends PromiseLike<unknown> ? [theCallbackMustBeSynchronous: never] : []): T;
/**
 * Whether the export walk in progress is writing the compact form.
 *
 * For the one thing that cannot be told: a schema getter. The walk calls
 * `get<Prop>()` with no arguments — that contract is what lets `getTextContent`
 * and `getURL` be ordinary node methods rather than serialization-specific
 * ones — so a getter whose value depends on the form has to read it here:
 *
 * ```ts
 * getSerializedThumbnail(): string | undefined {
 *   // Derivable from `src`, so the compact form leaves it out.
 *   return $isCompactExport() ? undefined : this.getLatest().__thumbnail;
 * }
 * ```
 *
 * A getter that serializes a *nested editor* needs nothing either, as long as
 * it goes through `editor.toJSON()`: that passes the form reported here on to
 * the nested `EditorState.toJSON`, which is what keeps an image caption in the
 * same form as the document containing it. A getter that reaches past it to
 * `editorState.toJSON()` gets the legacy form, and has to pass
 * `$isCompactExport()` itself to follow the document.
 *
 * This reports the form of the surrounding **export walk** — what
 * {@link $withCompactExport} established, and so what
 * `editorState.toJSON(compact)` and the `@lexical/clipboard` selection export
 * establish. It is deliberately *not* set by an individual
 * {@link LexicalNode.exportJSON} call: that method takes its own `compact`
 * argument and is called by the walk with the walk's form already in effect,
 * so having it set this too would say a document is compact when only one node
 * was asked to be. A bare `node.exportJSON(true)` outside a walk therefore
 * reports `false` here.
 *
 * Anything with a call site of its own should take the form as an argument
 * rather than read it here.
 *
 * @experimental
 */
export declare function $isCompactExport(): boolean;
/**
 * Export one node's JSON in the form the active export asks for, with the
 * sanity checks every export walk relies on: the serialized `type` must match
 * the class, and an element must carry a `children` array for the walk to fill.
 *
 * Use this instead of calling `node.exportJSON()` directly when writing a
 * serialization walk of your own — it is what `editorState.toJSON()` and the
 * `@lexical/clipboard` selection export both call, so {@link $withCompactExport}
 * governs every one of them alike.
 *
 * Which form that is decides the shape, so the return type is the
 * {@link SerializedPartial} — the one both forms satisfy. A caller that knows
 * it is not under {@link $withCompactExport} and wants the full type should
 * call `node.exportJSON()` directly.
 *
 * @experimental
 */
export declare function $exportNodeJSON(node: LexicalNode): SerializedPartial<SerializedLexicalNode>;
