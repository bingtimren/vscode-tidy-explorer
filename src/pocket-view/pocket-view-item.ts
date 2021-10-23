import * as vscode from "vscode";
import { isConfigurationTarget } from "../config/config-target";
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
        if (isConfigurationTarget(item)) {
            return [(typeof item === "string" ? `[${item}]` : item.name), vscode.TreeItemCollapsibleState.Collapsed];
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
