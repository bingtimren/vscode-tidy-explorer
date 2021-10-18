import { resolveTxt } from "dns";
import { Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, workspace, WorkspaceFolder, commands } from "vscode";
import { Selector } from "../config/selector";
import { SelectorFileCache } from "./selector-file-cache";
import { UriNode } from "./tidy-view-node";



// other data and values
const root: UriNode = UriNode.createRoot();
const onDidChangeTreeDataEmitter: EventEmitter<UriNode | undefined> = new EventEmitter<UriNode | undefined>();
    

// TidyExplorer DataProvider
export const tidyExplorerDataProvider : TreeDataProvider<UriNode> = {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,
    getTreeItem: function (element: UriNode): TreeItem | Thenable<TreeItem> {
        throw new Error("Function not implemented.");
    },
    getChildren: function (element?: UriNode): ProviderResult<UriNode[]> {
        throw new Error("Function not implemented.");
    }
}

/**
 * clean up explorer tree and associated selector file caches
 */
export function reset() {
    SelectorFileCache.resetAndDisposeAll();


}

/**
 * synchronise state with pocket and selectors - if this function is called, it means files.exclude is not changed but pockets / selector setting / state changed
 * 
 * 
 * make a set of existing selector keys
 * for each configuration target:
 *    for each selector:
 *       if EFFECTIVE state is "display"
 *           if not already added - get associated selector file cache and add
 *           otherwise remove from existing selector keys
 * for remaining selector keys (that are not associated with current selectors)
 *    remove from tidy explorer, expire selector cache
 *           
 */
export function reload() {

}


// async addSelector(selector: Selector) {
//         // add all files
//         for (const uri of await selector.getFileUris()) {
//             this.addFileWithoutFireEvent(uri, selector);
//         };
//         // listen to file changes
//         selector.onDidFileCreate((created) => {
//             this.addFileAndFireEvent(created, selector);
//         });
//         selector.onDidFileDelete((deleted) => {
//             this.deleteFile(deleted, selector.workspaceFolder);
//         });
//         this.onDidChangeTreeDataEmitter.fire(undefined); // refresh the whole tree
//     };
//     public removeSelector(selector: Selector) {
//         const nodeWhereDeletionOccurs = this.root.delChildrenFromSelector(selector.idString);
//         this.onDidChangeTreeDataEmitter.fire(nodeWhereDeletionOccurs === this.root? undefined : nodeWhereDeletionOccurs);
//     }
//     private addFileWithoutFireEvent(uri: Uri, fromSelector: Selector) {
//         const relativePath = this.getRelativePath(uri, fromSelector.workspaceFolder);
//         return this.root.addFile(uri, fromSelector.idString, relativePath, 0);
//     }
//     private addFileAndFireEvent(uri: Uri, fromSelector: Selector) {
//         const affectedNode = this.addFileWithoutFireEvent(uri, fromSelector);
//         this.onDidChangeTreeDataEmitter.fire(affectedNode === this.root? undefined : affectedNode );
//     }


//     private deleteFile(uri: Uri, knownWorkspaceFolder: WorkspaceFolder | undefined) {
//         const relativePath = this.getRelativePath(uri, knownWorkspaceFolder);
//         const affectedNode = this.root.delFile(relativePath, 0);
//         this.onDidChangeTreeDataEmitter.fire(affectedNode === this.root? undefined : affectedNode);
//     }
//     private getRelativePath(uri: Uri, knownWorkspaceFolder: WorkspaceFolder | undefined): string {
//         const workspaceFolder = knownWorkspaceFolder || workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
//         return workspace.asRelativePath(uri, true);
//     }
//     getTreeItem(element: UriNode): TreeItem | Thenable<TreeItem> {
//         const item = new TreeItem(element.uri!, element.children ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
//         if (!element.children) {
//             item.command = {
//                 command: "vscode.open",
//                 title: "Open",
//                 arguments: [item.resourceUri],
//             }
//         };
//         return item;
//     }
//     getChildren(element?: UriNode): ProviderResult<UriNode[]> {
//         return Object.values(element ?
//             (element.children ? Object.values(element.children) : []) :
//             (this.root.children ? Object.values(this.root.children) : [])
//         );
//     }
// }

