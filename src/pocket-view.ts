import * as vscode from "vscode";
import { Pocket, Selector } from "./pocket"


type PocketViewMode = "files.exclude" | "tidy-explorer";
type PocketSelectorItemCtx = (
    "files-x-set"|
    "files-x-unset" |
    "files-x-mixed"
);
let mode: PocketViewMode = "files.exclude";

/**
 * TreeView item for pocket or selector
 */
export class PocketSelectorItem extends vscode.TreeItem {
    constructor(readonly item: (Pocket | Selector)) {
        super(...getItemLabelAndCollapsibleState(item));
        decorateItem(item, this);
        this.contextValue = getItemContext(item);
    }
}


/**
 * DataProvider for Pocket View
 */
export class PocketTreeDataProvider implements vscode.TreeDataProvider<Pocket | Selector> {
    constructor(private root: Pocket[]) { };
    public reload(root: Pocket[]) {
        this.root = root;
        this.onDidChangeTreeData_.fire();
    }
    private onDidChangeTreeData_: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData?: vscode.Event<void | Pocket | Selector | null | undefined> | undefined = this.onDidChangeTreeData_.event;

    getTreeItem(element: Pocket | Selector): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new PocketSelectorItem(element);
    }
    getChildren(element?: Pocket | Selector): vscode.ProviderResult<(Pocket | Selector)[]> {
        if (element === undefined) {
            return this.root;
        };
        if (element instanceof Pocket) {
            return element.selectors as Selector[];
        };
        // Selector, no children to return
    };
    public setMode(newMode: PocketViewMode) {
        mode = newMode;
        this.onDidChangeTreeData_.fire();
    };
}

/**
 * add the pocket or selector into files.exclude setting
 * @param item 
 */
export function cmdAddToFilesExclude(item: Pocket | Selector) {
    item.setFilesExclude(true);
};

/**
 * remove the pocket or selector from files.exclude setting
 * @param item 
 */
export function cmdRemoveFromFilesExclude(item: Pocket | Selector) {
    item.setFilesExclude(false);
};


function getItemLabelAndCollapsibleState(item: Pocket | Selector): [string, vscode.TreeItemCollapsibleState] {
    if (item instanceof Pocket) {
        return [
            item.workspaceFolder ? `${item.name} @${item.workspaceFolder.name}` : item.name,
            item.selectors && item.selectors.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        ]
    } else { // Selector
        return [
            item.basePathJoinsIncludeGlob,
            vscode.TreeItemCollapsibleState.None];
    }
}

function decorateItem(item: Pocket | Selector, viewItem: vscode.TreeItem) {
    switch (mode) {
        case "files.exclude":
            if (item instanceof Selector) {
                viewItem.iconPath = item.isSetInFilesExcluded ? new vscode.ThemeIcon("eye-closed", new vscode.ThemeColor("list.warningForeground")) : new vscode.ThemeIcon("eye");
            } else {
                switch (item.isFilesExcludeAllSet()) {
                    case true:
                        viewItem.iconPath = new vscode.ThemeIcon("eye-closed", new vscode.ThemeColor("list.warningForeground"));
                        break;
                    case false:
                        viewItem.iconPath = new vscode.ThemeIcon("eye");
                        break;
                    case undefined:
                        viewItem.iconPath = new vscode.ThemeIcon("ellipsis");
                }
            }
            break;
        case "tidy-explorer":
            break;
    }
}


function getItemContext(item: Pocket | Selector): PocketSelectorItemCtx|undefined {
    switch (mode) {
        case "files.exclude":
            if (item instanceof Pocket) {
                const allSet = item.isFilesExcludeAllSet();
                return (allSet === true? 'files-x-set':
                    (allSet === false? 'files-x-unset' : "files-x-mixed"))
            } else {
                return (item.isSetInFilesExcluded? 'files-x-set': 'files-x-unset')
            }
        case "tidy-explorer":
            return undefined
    }
}

