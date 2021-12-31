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
            let tooltip: string = "";
            // selector
            switch (this.item.getEffectiveSetting()) {
                case "display":
                    tooltip = "Showing in Tidy Explorer.";
                    this.iconPath = new vscode.ThemeIcon("eye", new vscode.ThemeColor("list.highlightForeground"));
                    break;
                case "hidden":
                    tooltip = "Hidden, pattern in 'files.exclude' setting.";
                    this.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("list.warningForeground"));
                    break;
                case "inactive":
                    this.tooltip = "Not in use.";
                    this.iconPath = new vscode.ThemeIcon("debug-stackframe-dot", new vscode.ThemeColor("foreground"));
                    break;
            }
            if (this.item.getSetting() !== this.item.getEffectiveSetting()) {
                tooltip = tooltip + ` (setting '${this.item.getSetting()}' is overridden by a workspace or global setting)`;
            }
            this.tooltip = tooltip;

        } else {
            // configuration target
            this.iconPath = new vscode.ThemeIcon("gear", new vscode.ThemeColor("foreground"));
        }
    }

    /**
     * 
     * @returns context value that determines action icon appearance
     */
    private getContextValue(): string {
        if ((typeof(this.item)==="string") || (this.item instanceof Pocket && this.item.isDefaultExclude())  || (this.item instanceof Selector && this.item.isDefaultHidden)) {
            return ""; // nothing can be done
        }
        // S-can show     H-can hide    N-can set inactive
        return  "SHN";
    }
}
