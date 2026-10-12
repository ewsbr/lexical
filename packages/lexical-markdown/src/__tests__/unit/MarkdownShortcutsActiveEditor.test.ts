/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {registerMarkdownShortcuts} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getEditor,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
  type LexicalEditor,
  TextNode,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

/**
 * Text that depends on the editor it is read in, as a node that looks up a
 * title from the editor's context does.
 */
class EditorBoundTextNode extends TextNode {
  $config() {
    return this.config('editor-bound-text', {extends: TextNode});
  }

  getTextContent(): string {
    // Throws unless an editor is active.
    $getEditor();
    return super.getTextContent();
  }
}

const EditorBoundTestExtension = defineExtension({
  dependencies: [MarkdownTestExtension],
  name: 'EditorBoundTest',
  nodes: [EditorBoundTextNode],
  register: editor => registerMarkdownShortcuts(editor),
});

/** Types each character in its own discrete update, firing the shortcut listener. */
function type(editor: LexicalEditor, text: string): void {
  for (const character of text) {
    editor.update(
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(character);
        }
      },
      {discrete: true},
    );
  }
}

describe('Markdown shortcuts', () => {
  it('read nodes with the editor active', () => {
    using editor = buildEditorFromExtensions(EditorBoundTestExtension);
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append(paragraph);
        paragraph.append(new EditorBoundTextNode('See '), $createTextNode('a'));
        paragraph.selectEnd();
      },
      {discrete: true},
    );

    // Measuring the caret's offset reads the text before it.
    expect(() => type(editor, 'b')).not.toThrow();
    expect(editor.read(() => $getRoot().getTextContent())).toBe('See ab');
  });
});
