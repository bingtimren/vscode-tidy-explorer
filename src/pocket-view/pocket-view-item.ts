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
            return [(typeof target === "string" ? (target==="Global"?"User":"Workspace") : target.name), vscode.TreeItemCollapsibleState.Collapsed];
        } else if (item instanceof Pocket) {
            return [item.config.name, vscode.TreeItemCollapsibleState.Collapsed];
        } else { // Selector
            return [item.globPattern, vscode.TreeItemCollapsibleState.None];
        }
    }

    private decorateItem() {
        if (this.item instanceof Pocket) {
            this.iconPath = new vscode.ThemeIcon(this.item.isDefaultExclude()?"eye-closed":"files", new vscode.ThemeColor("foreground"));
            this.tooltip = "Pocket"
        }
        else if (this.item instanceof Selector) {
            let tooltip: string = "";
            // selector
            switch (this.item.getEffectiveSetting()) {
                case "display":
                    tooltip = "Pinned";
                    this.iconPath = new vscode.ThemeIcon("pinned", new vscode.ThemeColor("list.highlightForeground"));
                    break;
                case "hidden":
                    tooltip = "Hidden";
                    this.iconPath = new vscode.ThemeIcon("eye-closed", new vscode.ThemeColor("list.warningForeground"));
                    break;
                case "inactive":
                    tooltip = "Not in use";
                    this.iconPath = new vscode.ThemeIcon("debug-stackframe-dot", new vscode.ThemeColor("foreground"));
                    break;
            }
            if (this.item.getSetting() !== this.item.getEffectiveSetting()) {
                tooltip = tooltip + ` (this setting is overridden by a Workspace or User scope setting)`;
            }
            this.tooltip = tooltip;

        } else {
            // configuration target
            this.iconPath = new vscode.ThemeIcon(
                this.item === 'Global' ? "account" : (this.item === 'WorkSpace'? "gear" : "symbol-folder")
                , new vscode.ThemeColor("foreground"));
            this.tooltip = "Setting scope"
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
