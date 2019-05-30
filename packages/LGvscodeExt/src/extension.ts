/**
 * @module botbuilder-lg-vscode
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as vscode from 'vscode';
import {LGDiagnostics} from './lgDiagnostics';
import * as util from './util';
import {LGDebugPanel} from './providers/lgDebugPanel';
import {LGCompletionItemProvider} from './providers/lgCompletionItemProvider';
import {LGDefinitionProvider} from './providers/lgDefinitionProvider';
import { TemplateEngine } from 'botbuilder-lg';

/**
 * Main vs code Extension code part
 *
 * @export
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
    // LG debug webview window
    context.subscriptions.push(vscode.commands.registerCommand('lgLiveTest.start', () => {
       LGDebugPanel.createOrShow(context.extensionPath);
    }));

    // language diagnostic feature
    const collection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('lg');
    const compItems: vscode.CompletionItem[] = [];

	if (vscode.window.activeTextEditor && util.IsLgFile(vscode.window.activeTextEditor.document.fileName)) {
        updateDiagnostics(vscode.window.activeTextEditor.document, collection);
        updateInitCompletionItems(compItems);
    }

    // if you want to trigger the event for each text change, use: vscode.workspace.onDidChangeTextDocument
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(e => {
        updateDiagnostics(e, collection);
        updateInitCompletionItems(compItems);
    }));

    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(e => {
        updateDiagnostics(e, collection);updateInitCompletionItems(compItems);
    }));

    // code complete feature
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('*', new LGCompletionItemProvider(compItems)));
    
    // Show Definitions of a template symbol
    context.subscriptions.push(vscode.languages.registerDefinitionProvider('*', new LGDefinitionProvider()));
}

function updateDiagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): void {
    // special case
    if(document.fileName.endsWith('.git')) {
        return;
    }
    
	if (util.IsLgFile(document.fileName)) {
        var diagnostics = LGDiagnostics.GetLGDiagnostics(document.getText());
        var vscodeDiagnostics: vscode.Diagnostic[] = diagnostics.map(u => 
            new vscode.Diagnostic(
                new vscode.Range(
                    new vscode.Position(u.Range.Start.Line, u.Range.Start.Character),
                    new vscode.Position(u.Range.End.Line, u.Range.End.Character)),
                u.Message,
                u.Severity
            )
            );
        collection.set(document.uri, vscodeDiagnostics);
    } else {
        collection.clear();
    }
}

function updateInitCompletionItems(compItems: vscode.CompletionItem[]) {
    try {
        var templateNames: string[] = [];
        vscode.workspace.findFiles('**/*.lg').then(uris => {
            compItems.splice(0);
            uris.forEach(u => {
                const path: string =  u.path.substring(1); 
                const engine: TemplateEngine = TemplateEngine.fromFiles(path);
                const tempTemplateNames: string[] = engine.templates.map(u => u.Name);
                templateNames.forEach(u => {
                    if (tempTemplateNames.includes(u)) {
                        vscode.window.showWarningMessage(`template ${u} is duplicated.`);
                    }
                });
                templateNames = templateNames.concat(tempTemplateNames);
            });
            templateNames = Array.from(new Set(templateNames));
            templateNames.map(u => compItems.push(new vscode.CompletionItem(u)));
        });
    } catch(e) {
        vscode.window.showErrorMessage(e.message);
    }
}

export function deactivate() {
}