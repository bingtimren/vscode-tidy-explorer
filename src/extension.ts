// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {init, Pocket} from "./file-pocket"
import {PocketTreeDataProvider} from "./pocketsView"

const POCKET_VIEW_ID = "tidyExplorerPockets"

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const pockets : Pocket[] = init();
	
	// register view provider
	vscode.window.registerTreeDataProvider(POCKET_VIEW_ID, new PocketTreeDataProvider(pockets));
	// context.subscriptions.push();

}

// this method is called when your extension is deactivated
export function deactivate() {}
