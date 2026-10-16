/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig } from '../LexicalEditor.js';
import type { LexicalNode, NodeKey } from '../LexicalNode.js';
import { type SerializedTextNode, type TextDetailType, type TextModeType, TextNode } from './LexicalTextNode.js';
export type SerializedTabNode = SerializedTextNode;
/** @noInheritDoc */
export declare class TabNode extends TextNode {
    $config(): import("../index.js").BaseStaticNodeConfig & {
        readonly text?: {
            readonly extends: typeof LexicalNode;
            readonly generated: import("../index.js").GeneratedJSONFactory;
            readonly importDOM: {
                readonly '#text': () => {
                    conversion: (domNode: Node) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly b: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly code: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly em: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly i: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly mark: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly s: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly span: () => {
                    conversion: (domNode: HTMLSpanElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly strong: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly sub: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly sup: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
                readonly u: () => {
                    conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                    priority: 0;
                };
            };
            readonly json: import("../index.js").NodeSerializationSchema<TextNode, {
                readonly detail?: string | number | undefined;
                readonly format?: string | number | undefined;
                readonly mode?: "normal" | "token" | "segmented" | undefined;
                readonly style?: string | undefined;
                readonly text?: string | undefined;
            }>;
        } | undefined;
    } & import("../index.js").StaticNodeTypeAccessor<"text"> & import("../index.js").StaticNodeConfigAccessor<{
        readonly extends: typeof LexicalNode;
        readonly generated: import("../index.js").GeneratedJSONFactory;
        readonly importDOM: {
            readonly '#text': () => {
                conversion: (domNode: Node) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly b: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly code: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly em: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly i: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly mark: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly s: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly span: () => {
                conversion: (domNode: HTMLSpanElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly strong: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly sub: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly sup: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
            readonly u: () => {
                conversion: (domNode: HTMLElement) => import("../index.js").DOMConversionOutput;
                priority: 0;
            };
        };
        readonly json: import("../index.js").NodeSerializationSchema<TextNode, {
            readonly detail?: string | number | undefined;
            readonly format?: string | number | undefined;
            readonly mode?: "normal" | "token" | "segmented" | undefined;
            readonly style?: string | undefined;
            readonly text?: string | undefined;
        }>;
    }> & {
        readonly tab?: {
            readonly extends: typeof TextNode;
            readonly generated: import("../index.js").GeneratedJSONFactory;
            readonly json: import("../index.js").NodeSerializationSchema<TabNode, {
                readonly detail?: string | number | undefined;
                readonly mode?: "normal" | undefined;
                readonly text?: string | undefined;
            }>;
        } | undefined;
    } & import("../index.js").StaticNodeTypeAccessor<"tab"> & import("../index.js").StaticNodeConfigAccessor<{
        readonly extends: typeof TextNode;
        readonly generated: import("../index.js").GeneratedJSONFactory;
        readonly json: import("../index.js").NodeSerializationSchema<TabNode, {
            readonly detail?: string | number | undefined;
            readonly mode?: "normal" | undefined;
            readonly text?: string | undefined;
        }>;
    }>;
    constructor(key?: NodeKey | undefined);
    createDOM(config: EditorConfig): HTMLElement;
    /**
     * Always normalizes the stored content to `'\t'` regardless of input — see
     * comment below for the rationale.
     */
    setTextContent(_text: string): this;
    spliceText(offset: number, delCount: number, newText: string, moveSelection?: boolean): TextNode;
    setDetail(detail: TextDetailType | number): this;
    setMode(type: TextModeType): this;
    canInsertTextBefore(): boolean;
    canInsertTextAfter(): boolean;
}
/** Creates a TabNode representing a horizontal tab character. */
export declare function $createTabNode(): TabNode;
/** Returns true if the given node is a TabNode. */
export declare function $isTabNode(node: LexicalNode | null | undefined): node is TabNode;
