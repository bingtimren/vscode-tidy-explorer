// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PocketConfiguration } from './configuration';
import { Pocket } from "./file-pocket"
import { CONFIG_KEY, FILES_EXCLUDE_KEY, POCKET_VIEW_ID } from './id-keys';
import { PocketTreeDataProvider } from "./pocketsView"


function pocketInit(): Pocket[] {
	const config = vscode.workspace.getConfiguration(CONFIG_KEY);
	const pocketConfigs: PocketConfiguration[] = config.pockets; // sync with package.json
	return pocketConfigs.map((config) => new Pocket(config));
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const pockets: Pocket[] = pocketInit();
	const pocketViewDataProvider = new PocketTreeDataProvider(pockets);
	const pocketView = vscode.window.createTreeView(POCKET_VIEW_ID, {
		treeDataProvider: pocketViewDataProvider
	});

	
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration(CONFIG_KEY) || event.affectsConfiguration(FILES_EXCLUDE_KEY)
		) {
			// reload
			const pockets: Pocket[] = pocketInit();
			pocketViewDataProvider.reload(pockets);
		};
	});
}



// this method is called when your extension is deactivated
export function deactivate() { }
