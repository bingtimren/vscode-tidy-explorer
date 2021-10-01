// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PocketConfiguration } from './configuration';
import { Pocket, pocketInit } from "./pocket"
import { CMD_ADD_TO_FILE_EXCLUDES, CMD_REMOVE_FROM_FILE_EXCLUDES, CONFIG_KEY, FILES_EXCLUDE_KEY, POCKET_VIEW_ID } from './id-keys';
import { cmdAddToFilesExclude, cmdRemoveFromFilesExclude, PocketTreeDataProvider } from "./pocket-view"


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// load pockets & create pocket view with data provider
	const pocketViewDataProvider = new PocketTreeDataProvider(pocketInit());
	const pocketView = vscode.window.createTreeView(POCKET_VIEW_ID, {
		treeDataProvider: pocketViewDataProvider
	});
	context.subscriptions.push(pocketView);

	// listen to config changes relate to (1) this extension or (2) files.exclude
	// and reload the view data
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration(CONFIG_KEY) || event.affectsConfiguration(FILES_EXCLUDE_KEY)
		) {
			pocketViewDataProvider.reload(pocketInit());
		};
	});

	// add commands
	vscode.commands.registerCommand(
		CMD_ADD_TO_FILE_EXCLUDES, cmdAddToFilesExclude
	)
	vscode.commands.registerCommand(
		CMD_REMOVE_FROM_FILE_EXCLUDES, cmdRemoveFromFilesExclude
	)
	
}



// this method is called when your extension is deactivated
export function deactivate() { }
