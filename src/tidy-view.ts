import { Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, workspace, WorkspaceFolder } from "vscode";
import { Selector } from "./selector";
import { UriNode } from "./tidy-view-node";

const PATH_SEPARATOR = "/";


export class TidyExplorerTreeDataProvider implements TreeDataProvider<UriNode>{
    private onDidChangeTreeDataEmitter: EventEmitter<UriNode | undefined> = new EventEmitter<UriNode | undefined>();
    readonly onDidChangeTreeData: Event<void | UriNode | null | undefined> = this.onDidChangeTreeDataEmitter.event;
    private readonly root : UriNode = UriNode.createRoot();
    private selectors: Selector[] = [];
    public addSelector(selector: Selector) {
        // add all files
        for (const uri of selector.fileUris) {
            this.addFile(uri, selector);
        };
        // listen to file changes
        selector.onDidFileCreate((created)=>{
            this.addFile(created, selector);
        });
        selector.onDidFileDelete((deleted)=>{
            this.deleteFile(deleted, selector.workspaceFolder);
        });
        this.onDidChangeTreeDataEmitter.fire(undefined);
    };
    public removeSelector(selector: Selector) {
        const affectedNode = this.root.delChildrenFromSelector(selector);
        this.onDidChangeTreeDataEmitter.fire(affectedNode);
    }
    private addFile(uri: Uri, fromSelector: Selector) {
        const relativePath = this.getRelativePath(uri, fromSelector.workspaceFolder);
        const affectedNode = this.root.addChildren(uri, fromSelector, relativePath, 0); 
        this.onDidChangeTreeDataEmitter.fire(affectedNode);
    }
    private deleteFile(uri: Uri, knownWorkspaceFolder: WorkspaceFolder|undefined) {
        const relativePath = this.getRelativePath(uri, knownWorkspaceFolder);
        const affectedNode = this.root.delChildren(relativePath, 0);
        this.onDidChangeTreeDataEmitter.fire(affectedNode);
    }
    private getRelativePath(uri:Uri, knownWorkspaceFolder: WorkspaceFolder|undefined):string {
        const workspaceFolder = knownWorkspaceFolder || workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
        const relativePath = workspace.asRelativePath(uri);
        return workspaceFolder.name+(relativePath.startsWith(PATH_SEPARATOR)?"":PATH_SEPARATOR)+relativePath;
    }
    getTreeItem(element: UriNode): TreeItem | Thenable<TreeItem> {
        const item = new TreeItem(element.name, element.children?TreeItemCollapsibleState.Collapsed:TreeItemCollapsibleState.None);
        item.resourceUri = element.uri!;
        return item;
    }
    getChildren(element?: UriNode): ProviderResult<UriNode[]> {
            return Object.values(element? (element.children||[]) : (this.root.children||[]));
    }
}

export function returnNextSeparatorAndName(relativePath: string, startPosition: number):[number, string] {
    // find next section 
    const nextSeparator = relativePath.indexOf(PATH_SEPARATOR, startPosition);
    // the child node's name, either a file or dir name
    const name = relativePath.substr(startPosition, (nextSeparator > 0 ? nextSeparator : relativePath.length) - startPosition);
    return [nextSeparator, name];
}
