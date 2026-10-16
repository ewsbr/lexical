/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalNode } from './LexicalNode.js';
import type { CompactDefaultTest } from './LexicalUtils.js';
import type { ElementNode } from './nodes/LexicalElementNode.js';
import type { TextNode } from './nodes/LexicalTextNode.js';
import { type ComposedSchemaFields } from './LexicalSchema.js';
/**
 * The generated implementations for one node class.
 *
 * Each is handed to the class it was generated from through that class's
 * `$config`, so nothing has to match code to class at runtime.
 *
 * @internal
 */
export interface GeneratedJSON {
    exportJSON(node: LexicalNode): {
        [key: string]: unknown;
    };
    exportCompactJSON?(node: LexicalNode, isCompactDefault: CompactDefaultTest): {
        [key: string]: unknown;
    };
    updateFromJSON?(node: LexicalNode, json: {
        readonly [key: string]: unknown;
    }): LexicalNode;
    afterCloneFrom?(node: LexicalNode, prevNode: LexicalNode): void;
}
/**
 * Builds the generated implementations for one class from that class's
 * composed schema, which the registration hands it: the lookup tables the
 * code reads are the schema's own objects, read from it here, so a generated
 * module holds no copy of a table and nothing about one is written into it
 * at build time.
 *
 * @internal
 */
export type GeneratedJSONFactory = (fields: ComposedSchemaFields) => GeneratedJSON;
/**
 * ElementNode's schema-declared fields, for a clone. Generated from that
 * schema; do not edit by hand.
 *
 * @internal
 */
export declare function afterCloneElementNode(node: ElementNode, prevNode: ElementNode): void;
/** ElementNode's generated implementations, for its `$config`. @internal */
export declare const GENERATED_ELEMENT: GeneratedJSONFactory;
/**
 * TextNode's schema-declared fields, for a clone. Generated from that
 * schema; do not edit by hand.
 *
 * @internal
 */
export declare function afterCloneTextNode(node: TextNode, prevNode: TextNode): void;
/** TextNode's generated implementations, for its `$config`. @internal */
export declare const GENERATED_TEXT: GeneratedJSONFactory;
/** ParagraphNode's generated implementations, for its `$config`. @internal */
export declare const GENERATED_PARAGRAPH: GeneratedJSONFactory;
/** LineBreakNode's generated implementations, for its `$config`. @internal */
export declare const GENERATED_LINEBREAK: GeneratedJSONFactory;
/** TabNode's generated implementations, for its `$config`. @internal */
export declare const GENERATED_TAB: GeneratedJSONFactory;
