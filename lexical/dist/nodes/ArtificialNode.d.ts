/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig } from 'lexical';
import { ElementNode } from './LexicalElementNode.js';
/** @internal */
export declare class ArtificialNode__DO_NOT_USE extends ElementNode {
    $config(): import("lexical").BaseStaticNodeConfig & import("lexical").StaticNodeConfigAccessor<{
        readonly $transform: (node: ElementNode) => void;
        readonly extends: typeof import("lexical").LexicalNode;
        readonly generated: import("lexical").GeneratedJSONFactory;
        readonly json: import("lexical").NodeSerializationSchema<ElementNode, {
            readonly direction?: "ltr" | "rtl" | null | undefined;
            readonly format?: "" | "left" | "start" | "center" | "right" | "end" | "justify" | undefined;
            readonly indent?: string | number | undefined;
            readonly textFormat?: string | number | undefined;
            readonly textStyle?: string | undefined;
        }>;
    }> & {
        readonly artificial?: {
            readonly extends: typeof ElementNode;
        } | undefined;
    } & import("lexical").StaticNodeTypeAccessor<"artificial"> & import("lexical").StaticNodeConfigAccessor<{
        readonly extends: typeof ElementNode;
    }>;
    createDOM(config: EditorConfig): HTMLElement;
}
