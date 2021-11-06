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
        if (typeof (item) === "string") {
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
        if (this.item instanceof Pocket) {
            this.iconPath = new vscode.ThemeIcon(this.item.isDefaultExclude()?"eye-closed":"list-selection", new vscode.ThemeColor("foreground"));
        }
        else if (this.item instanceof Selector) {
            // selector
            this.tooltip = "a glob pattern";
            switch (this.item.getEffectiveSetting()) {
                case "display-by-inheritance": this.tooltip = "Overridden"
                case "display":
                    this.iconPath = new vscode.ThemeIcon("eye", new vscode.ThemeColor("foreground"));
                    break;
                case "hidden":
                case "hidden-by-default":
                    this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("foreground"));
                    break;
                case "inactive":


            }

        } else {
            // configuration target
            this.iconPath = new vscode.ThemeIcon("gear", new vscode.ThemeColor("foreground"));
        }
    }

    private getContextValue(): string {
        if ((this.item instanceof Pocket && this.item.isDefaultExclude())  || (this.item instanceof Selector && this.item.getSetting() === "hidden-by-default")) {
            return ""; // nothing can be done
        }
        // S-can show     H-can hide    N-can set inactive
        return  "SHN";
    }
}
