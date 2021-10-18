import * as vscode from "vscode";
import { ConfigurationTarget, getTargetFromKey } from "../config/config-target";
import { Pocket } from "../config/pocket"
import { Selector } from "../config/selector";
import { PocketViewItem } from "./pocket-view-item";


export type PocketViewNodeType = ConfigurationTarget | Pocket | Selector;

const onDidChangeEmitter = new vscode.EventEmitter<void>();

export const pocketViewDataProvider : vscode.TreeDataProvider<PocketViewNodeType> = {
    onDidChangeTreeData: onDidChangeEmitter.event,
    getTreeItem(element: PocketViewNodeType): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new PocketViewItem(element);
    },
    getChildren(element?: PocketViewNodeType): vscode.ProviderResult<PocketViewNodeType[]> {
        if (!element) { // root, return configuration target array
            return Array.from(Pocket.registry.keys()).map((key) => getTargetFromKey(key))
        } else if (element instanceof Pocket) {
            return element.selectors as Selector[]
        } else {
            return null
        }
    }

}




