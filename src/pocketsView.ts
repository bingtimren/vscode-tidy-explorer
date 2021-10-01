import * as vscode from "vscode";
import { Pocket, Selector } from "./file-pocket"

/**
 * TreeView item for pocket or selector
 */
export class PocketSelectorItem extends vscode.TreeItem {
    constructor(readonly item: (Pocket | Selector)) {
        super(...getItemLabelAndCollapsibleState(item));
        decorateItem(item, this);
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
    }

}

/**
 * add the pocket or selector into files.exclude setting
 * @param item 
 */
export function cmdAddToFilesExclude(item: Pocket | Selector) {
    setFilesExclude(item, true);
};

/**
 * remove the pocket or selector from files.exclude setting
 * @param item 
 */
export function cmdRemoveFromFilesExclude(item: Pocket | Selector) {
    setFilesExclude(item, false);
};


function getItemLabelAndCollapsibleState(item: Pocket | Selector): [string, vscode.TreeItemCollapsibleState] {
    if (item instanceof Pocket) {
        return [
            item.workspaceFolder ? `${item.name} (${item.workspaceFolder.name})` : item.name,
            item.selectors && item.selectors.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        ]
    } else { // Selector
        return [item.basePathJoinsIncludeGlob, vscode.TreeItemCollapsibleState.None];
    }
}

function decorateItem(item: Pocket | Selector, viewItem: vscode.TreeItem) {
    if (item instanceof Selector) {
        viewItem.iconPath = new vscode.ThemeIcon("list-flat");
    }
}

async function setFilesExclude(item: Pocket | Selector, include: boolean) {
    const items: readonly Selector[] = item instanceof Pocket ? item.selectors : [item];
    for (item of items) {
        await item.setFilesExclude(include);
    }
}


