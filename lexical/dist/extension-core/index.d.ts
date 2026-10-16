/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export { configExtension, declarePeerDependency, defineExtension, } from './defineExtension.js';
export { type configTypeSymbol, type initTypeSymbol, type LexicalExtensionInternal, type outputTypeSymbol, } from './internal.js';
export { safeCast } from './safeCast.js';
export { shallowMergeConfig } from './shallowMergeConfig.js';
export { type AnyLexicalExtension, type AnyLexicalExtensionArgument, type AnyNormalizedLexicalExtensionArgument, type ExtensionBuildState, type ExtensionConfigBase, type ExtensionInitState, type ExtensionRegisterState, type InitialEditorConfig, type InitialEditorStateType, type LexicalEditorWithDispose, type LexicalExtension, type LexicalExtensionArgument, type LexicalExtensionConfig, type LexicalExtensionDependency, type LexicalExtensionInit, type LexicalExtensionName, type LexicalExtensionOutput, type NormalizedLexicalExtensionArgument, type NormalizedPeerDependency, type OutputComponentExtension, type OutputExtension, } from './types.js';
