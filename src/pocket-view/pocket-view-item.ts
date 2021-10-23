import * as vscode from "vscode";
import { getTargetFromKey, isConfigurationTarget } from "../config/config-target";
import { Pocket } from "../config/pocket";
import { Selector } from "../config/selector";
import { PocketViewNodeType } from "./pocket-view";

/**
 * TreeView item for pocket or selector
 */

export class PocketViewItem extends vscode.TreeItem {
    constructor(readonly item: PocketViewNodeType) {
        super(...PocketViewItem.getItemLabelAndCollapsibleState(item));
        this.decorateItem();
        this.contextValue = this.getContextValue();
    }


    private static getItemLabelAndCollapsibleState(item: PocketViewNodeType): [string, vscode.TreeItemCollapsibleState] {
        if (typeof(item)==="string") {
            // target key
            const target = getTargetFromKey(item);
            return [(typeof target === "string" ? `[${target}]` : target.name), vscode.TreeItemCollapsibleState.Collapsed];
        } else if (item instanceof Pocket) {
            return [item.config.name, vscode.TreeItemCollapsibleState.Collapsed];
        } else { // Selector
            return [item.globPattern, vscode.TreeItemCollapsibleState.None];
        }
    }

    private decorateItem() {
        if (isConfigurationTarget(this.item)) {
            // configuration target
        }
        else if (this.item instanceof Selector) {
            // selector
        } else {
            // pocket
        }
    }

    private getContextValue(): string {
        return "";
    }
}
