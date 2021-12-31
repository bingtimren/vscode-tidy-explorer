import * as vscode from "vscode";
import { getTargetKey } from "../config/config-target";
import { Pocket } from "../config/pocket";
import { Selector } from "../config/selector";
import { PocketViewItem } from "./pocket-view-item";


export type PocketViewNodeType = string | Pocket | Selector;

export const onDidChangeEmitter = new vscode.EventEmitter<void>();

export const pocketViewDataProvider : vscode.TreeDataProvider<PocketViewNodeType> = {
    onDidChangeTreeData: onDidChangeEmitter.event,
    getTreeItem(element: PocketViewNodeType): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new PocketViewItem(element);
    },
    getChildren(element?: PocketViewNodeType): vscode.ProviderResult<PocketViewNodeType[]> {
        if (!element) { // root, return configuration target array
            return Array.from(Pocket.registry.keys());
        } else if (typeof(element)==="string") { // configuration target keys
            const targetPocketRegistry = Pocket.registry.get(element);
            return Array.from(targetPocketRegistry?.values() || []);
        } else if (element instanceof Pocket) {
            return element.selectors as Selector[];
        } else {
            return null;
        }
    },
    getParent(element: PocketViewNodeType): vscode.ProviderResult<PocketViewNodeType>{
        if (typeof(element)==="string") { // configuration target keys
            return null;
        } else if (element instanceof Pocket) {
            return getTargetKey( element.target);
        } else {
            return null;
        }
    }

};




