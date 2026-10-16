/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalNode, SerializedPartial } from '../LexicalNode.js';
import { ElementNode, type SerializedElementNode } from './LexicalElementNode.js';
export type SerializedRootNode = SerializedElementNode;
/** @noInheritDoc */
export declare class RootNode extends ElementNode {
    /** @internal */
    __cachedText: null | string;
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
        readonly root?: {
            readonly extends: typeof ElementNode;
        } | undefined;
    } & import("../index.js").StaticNodeTypeAccessor<"root"> & import("../index.js").StaticNodeConfigAccessor<{
        readonly extends: typeof ElementNode;
    }>;
    constructor();
    getTopLevelElementOrThrow(): never;
    getTextContent(): string;
    remove(): never;
    replace<N = LexicalNode>(node: N): never;
    insertBefore(nodeToInsert: LexicalNode): LexicalNode;
    insertAfter(nodeToInsert: LexicalNode): LexicalNode;
    updateDOM(prevNode: this, dom: HTMLElement): false;
    splice(start: number, deleteCount: number, nodesToInsert: LexicalNode[]): this;
    static importJSON(serializedNode: SerializedPartial<SerializedRootNode>): RootNode;
    collapseAtStart(): true;
}
export declare function $createRootNode(): RootNode;
/** Returns true if the given node is a RootNode. */
export declare function $isRootNode(node: RootNode | LexicalNode | null | undefined): node is RootNode;
