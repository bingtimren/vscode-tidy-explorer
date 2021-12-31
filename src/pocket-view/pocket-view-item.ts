import * as vscode from "vscode";
import { getTargetFromKey } from "../config/config-target";
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
            switch (this.item.getEffectiveSetting()) {
                case "display-by-inheritance": 
                    this.tooltip = "Showing in Tidy Explorer because of a parent (workspace or global) setting";
                    this.iconPath = new vscode.ThemeIcon("eye", new vscode.ThemeColor("list.highlightForeground"));
                    break;
                case "display":
                    this.tooltip = "Showing in Tidy Explorer";
                    this.iconPath = new vscode.ThemeIcon("eye", new vscode.ThemeColor("list.highlightForeground"));
                    break;
                case "hidden":
                    this.tooltip = "Added into 'files.exclude' setting, hidden in file explorer";
                    this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("list.warningForeground"));
                    break;
                case "hidden-by-inheritance":
                    this.tooltip = "Added into a parent's (workspace or global) 'files.exclude' setting, hidden in file explorer";
                    this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("list.warningForeground"));
                    break;
                case "hidden-by-default":
                    this.tooltip = "In default 'files.exclude' setting, hidden in file explorer";
                    this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("list.warningForeground"));
                    break;
                case "inactive":
                    this.tooltip = "Not using this pattern, no effect";
                    this.iconPath = new vscode.ThemeIcon("debug-stackframe-dot", new vscode.ThemeColor("foreground"));
                    break;

            }

        } else {
            // configuration target
            this.iconPath = new vscode.ThemeIcon("gear", new vscode.ThemeColor("foreground"));
        }
    }

    private getContextValue(): string {
        if ((typeof(this.item)==="string") || (this.item instanceof Pocket && this.item.isDefaultExclude())  || (this.item instanceof Selector && this.item.getSetting() === "hidden-by-default")) {
            return ""; // nothing can be done
        }
        // S-can show     H-can hide    N-can set inactive
        return  "SHN";
    }
}
