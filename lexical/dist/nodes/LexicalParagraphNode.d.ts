/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, KlassConstructor, LexicalEditor, Spread } from '../LexicalEditor.js';
import type { DOMConversionOutput, DOMExportOutput, LexicalNode, SerializedPartial } from '../LexicalNode.js';
import type { BaseSelection, RangeSelection } from '../LexicalSelection.js';
import { ElementNode, type SerializedElementNode } from './LexicalElementNode.js';
export type SerializedParagraphNode = Spread<{
    textFormat: number;
    textStyle: string;
}, SerializedElementNode>;
/** @noInheritDoc */
export declare class ParagraphNode extends ElementNode {
    /** @internal */
    ['constructor']: KlassConstructor<typeof ParagraphNode>;
    $config(): import("../index.js").BaseStaticNodeConfig & import("../index.js").StaticNodeConfigAccessor<{
        readonly $transform: (node: ElementNode) => void;
        readonly extends: typeof LexicalNode;
        readonly generated: import("../index.js").GeneratedJSONFactory;
        readonly json: import("../index.js").NodeSerializationSchema<ElementNode, {
            readonly direction?: "ltr" | "rtl" | null | undefined;
            readonly format?: "" | "left" | "start" | "center" | "right" | "end" | "justify" | undefined;
            readonly indent?: string | number | undefined;
            readonly textFormat?: string | number | undefined;
            readonly textStyle?: string | undefined;
        }>;
    }> & {
        readonly paragraph?: {
            readonly extends: typeof ElementNode;
            readonly generated: import("../index.js").GeneratedJSONFactory;
            readonly importDOM: {
                readonly p: () => {
                    conversion: typeof $convertParagraphElement;
                    priority: 0;
                };
            };
        } | undefined;
    } & import("../index.js").StaticNodeTypeAccessor<"paragraph"> & import("../index.js").StaticNodeConfigAccessor<{
        readonly extends: typeof ElementNode;
        readonly generated: import("../index.js").GeneratedJSONFactory;
        readonly importDOM: {
            readonly p: () => {
                conversion: typeof $convertParagraphElement;
                priority: 0;
            };
        };
    }>;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: ParagraphNode, dom: HTMLElement, config: EditorConfig): boolean;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    exportJSON(compact?: false): SerializedParagraphNode;
    exportJSON(compact: boolean): SerializedPartial<SerializedParagraphNode>;
    extractWithChild(child: LexicalNode, selection: BaseSelection | null, destination: 'clone' | 'html'): boolean;
    insertNewAfter(rangeSelection: RangeSelection, restoreSelection: boolean): ParagraphNode;
    collapseAtStart(): boolean;
}
declare function $convertParagraphElement(element: HTMLElement): DOMConversionOutput;
/** Creates a ParagraphNode, the default block-level container for text. */
export declare function $createParagraphNode(): ParagraphNode;
/** Returns true if the given node is a ParagraphNode. */
export declare function $isParagraphNode(node: LexicalNode | null | undefined): node is ParagraphNode;
export {};
