// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as key from './config/id-keys';
import * as controller from "./control/controller"
import {pocketViewDataProvider} from "./pocket-view/pocket-view"
import {tidyExplorerDataProvider} from "./tidy-explorer/tidy-view"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// register views
	const pocketView = vscode.window.createTreeView(key.POCKET_VIEW_ID, {
		treeDataProvider: pocketViewDataProvider
	});
	context.subscriptions.push(pocketView);

	const tidyExplorer = vscode.window.createTreeView(key.FILE_VIEW_ID, { 
		treeDataProvider: tidyExplorerDataProvider 
	});
	context.subscriptions.push(tidyExplorer);

	// register config change event handler
	vscode.workspace.onDidChangeConfiguration(async (event) => {
		await controller.startUp(event);
	});

	// register commands
	vscode.commands.registerCommand(
		key.CMD_SET_DISPLAY, controller.setSelectorState.bind(undefined, "display")
	);
	vscode.commands.registerCommand(
		key.CMD_SET_HIDDEN, controller.setSelectorState.bind(undefined, "hidden")
	);
	vscode.commands.registerCommand(
		key.CMD_SET_INACTIVE, controller.setSelectorState.bind(undefined, "inactive")
	);
	
	// load and start-up
	controller.startUp();
}



// this method is called when your extension is deactivated
export function deactivate() { }
