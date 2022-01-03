// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as key from './config/id-keys';
import { Pocket } from './config/pocket';
import { Selector } from './config/selector';
import * as controller from "./control/controller";
import { pocketViewDataProvider } from "./pocket-view/pocket-view";
import { tidyExplorerDataProvider, clear as tidyViewClear, reload as tidyViewReload } from "./tidy-explorer/tidy-view";


export let globalState: vscode.Memento | undefined = undefined;
export let workspaceState: vscode.Memento | undefined = undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// set the exported states
	globalState = context.globalState;
	workspaceState = context.workspaceState;

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
		key.CMD_SET_DISPLAY, async (item: Pocket | Selector) => { pocketView.reveal(item, {select:true, focus:true}); await controller.setSelectorState("display", item); }
	);
	vscode.commands.registerCommand(
		key.CMD_SET_HIDDEN, async (item: Pocket | Selector) => { pocketView.reveal(item, {select:true, focus:true}); await controller.setSelectorState("hidden", item); }
	);
	vscode.commands.registerCommand(
		key.CMD_SET_INACTIVE, async (item: Pocket | Selector) => { pocketView.reveal(item, {select:true, focus: true}); await controller.setSelectorState("inactive", item); }
	);
	vscode.commands.registerCommand(
		key.CMD_TIDY_EXPLORER_REFRESH, async ()=>{
			tidyViewClear();
			await tidyViewReload();			
		}
	)

	// load and start-up
	controller.startUp();
}



// this method is called when your extension is deactivated
export function deactivate() { }
