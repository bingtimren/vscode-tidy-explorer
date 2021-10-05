import { Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, workspace, WorkspaceFolder, commands } from "vscode";
import { Selector } from "./selector";
import { UriNode } from "./tidy-view-node";

const PATH_SEPARATOR = "/";


export class TidyExplorerTreeDataProvider implements TreeDataProvider<UriNode>{
    private onDidChangeTreeDataEmitter: EventEmitter<UriNode | undefined> = new EventEmitter<UriNode | undefined>();
    readonly onDidChangeTreeData: Event<void | UriNode | null | undefined> = this.onDidChangeTreeDataEmitter.event;
    private readonly root: UriNode = UriNode.createRoot();
    private selectors: Selector[] = [];
    public async addSelector(selector: Selector) {
        // add all files
        for (const uri of await selector.getFileUris()) {
            this.addFileWithoutFireEvent(uri, selector);
        };
        // listen to file changes
        selector.onDidFileCreate((created) => {
            this.addFileAndFireEvent(created, selector);
        });
        selector.onDidFileDelete((deleted) => {
            this.deleteFile(deleted, selector.workspaceFolder);
        });
        this.onDidChangeTreeDataEmitter.fire(undefined); // refresh the whole tree
    };
    public removeSelector(selector: Selector) {
        const nodeWhereDeletionOccurs = this.root.delChildrenFromSelector(selector.idString);
        this.onDidChangeTreeDataEmitter.fire(nodeWhereDeletionOccurs === this.root? undefined : nodeWhereDeletionOccurs);
    }
    private addFileWithoutFireEvent(uri: Uri, fromSelector: Selector) {
        const relativePath = this.getRelativePath(uri, fromSelector.workspaceFolder);
        return this.root.addFile(uri, fromSelector.idString, relativePath, 0);
    }
    private addFileAndFireEvent(uri: Uri, fromSelector: Selector) {
        const affectedNode = this.addFileWithoutFireEvent(uri, fromSelector);
        this.onDidChangeTreeDataEmitter.fire(affectedNode === this.root? undefined : affectedNode );
    }


    private deleteFile(uri: Uri, knownWorkspaceFolder: WorkspaceFolder | undefined) {
        const relativePath = this.getRelativePath(uri, knownWorkspaceFolder);
        const affectedNode = this.root.delFile(relativePath, 0);
        this.onDidChangeTreeDataEmitter.fire(affectedNode === this.root? undefined : affectedNode);
    }
    private getRelativePath(uri: Uri, knownWorkspaceFolder: WorkspaceFolder | undefined): string {
        const workspaceFolder = knownWorkspaceFolder || workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
        return workspace.asRelativePath(uri, true);
    }
    getTreeItem(element: UriNode): TreeItem | Thenable<TreeItem> {
        const item = new TreeItem(element.uri!, element.children ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
        if (!element.children) {
            item.command = {
                command: "vscode.open",
                title: "Open",
                arguments: [item.resourceUri],
            }
        };
        return item;
    }
    getChildren(element?: UriNode): ProviderResult<UriNode[]> {
        return Object.values(element ?
            (element.children ? Object.values(element.children) : []) :
            (this.root.children ? Object.values(this.root.children) : [])
        );
    }
}

export function returnNextSeparatorAndName(relativePath: string, startPosition: number): [number, string] {
    // find next section 
    const nextSeparator = relativePath.indexOf(PATH_SEPARATOR, startPosition);
    // the child node's name, either a file or dir name
    const name = relativePath.substr(startPosition, (nextSeparator > 0 ? nextSeparator : relativePath.length) - startPosition);
    return [nextSeparator, name];
}
