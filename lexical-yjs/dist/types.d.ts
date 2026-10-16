/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { CollabDecoratorNode } from './CollabDecoratorNode.js';
import type { CollabElementNode } from './CollabElementNode.js';
import type { CollabLineBreakNode } from './CollabLineBreakNode.js';
import type { CollabTextNode } from './CollabTextNode.js';
declare module 'yjs' {
    interface XmlElement {
        _collabNode: CollabDecoratorNode;
    }
    interface XmlText {
        _collabNode: CollabElementNode;
    }
    interface Map<MapType> {
        _collabNode: CollabLineBreakNode | CollabTextNode;
    }
}
