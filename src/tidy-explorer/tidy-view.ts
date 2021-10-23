
import { Disposable, EventEmitter, ProviderResult, RelativePattern, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, workspace, WorkspaceFolder } from "vscode";
import { forEachConfigurationTarget } from "../config/config-target";
import { Selector } from "../config/selector";
import { getGlobIdString, SelectorFileCache, SelectorGlobPattern } from "./selector-file-cache";
import { UriNode } from "./tidy-view-node";

// other data and values
const root: UriNode = UriNode.createRoot();
const onDidChangeTreeDataEmitter: EventEmitter<UriNode | undefined> = new EventEmitter<UriNode | undefined>();
// globIdStrings -> disposable
const subscriptions: Map<string, Disposable[]> = new Map();

// TidyExplorer DataProvider
export const tidyExplorerDataProvider: TreeDataProvider<UriNode> = {
    onDidChangeTreeData: onDidChangeTreeDataEmitter.event,
    getTreeItem: function (element: UriNode): TreeItem | Thenable<TreeItem> {
        return new TreeItem(element.uri!, element.children ? TreeItemCollapsibleState.Collapsed : TreeItemCollapsibleState.None);
    },
    getChildren: function (element?: UriNode): ProviderResult<UriNode[]> {
        return (element ?
            (element.children ? Array.from(element.children.values()) : [])
            : Array.from(root.children!.values()));
    }
}



/**
 * clean up explorer tree and associated selector file caches
 */
export function clear() {
    for (const disposables of subscriptions.values()) {
        disposables.forEach((d)=>{d.dispose()});
    }
    SelectorFileCache.resetAndDisposeAll();
    root.clear();
}

/**
 * synchronize view with selectors, add "display" selectors and remove non-"display" selectors
 * 
 * preserve existing subscription globIdStrings as a set EX-SET
 * for each configuration target:
 *      for each entry (glob / selector) in target's selector registry:
 *          SUCCESS = remove from EX-SET
 *          if "display" 
 *              SUCCESS - continue (desire display already display)
 *              !SUCCESS - addGlob
 *          else 
 *              SUCCESS - remove
 *              !SUCCESS - nothing (not desire display not already display)
 * for each remaining in EX-SET
 *      remove & dispose cache (glob not in selectors)
 */
export async function reload() {
    const existingGlobIds = new Set(subscriptions.keys());
    await forEachConfigurationTarget(async (target) => {
        const  knownWorkspaceFolder = typeof(target)==="string"?undefined:target;
        const targetSelectorRegistry = Selector.getRegistryByTarget(target);
        for (const selector of targetSelectorRegistry.values()) {
            const selectorGlob = getWatcherGlob(selector);
            const selectorGlobIdStr = getGlobIdString(selectorGlob);
            const isSubscribed = existingGlobIds.delete(selectorGlobIdStr);
            if (selector.getEffectiveSetting() === "display") { // if being "display-by-inheritance" no action is needed
                if (!isSubscribed) {
                    addSelector(knownWorkspaceFolder, selectorGlobIdStr);
                } // else nothing to do
            } else {
                if (isSubscribed) {
                    removeSelector(selectorGlobIdStr);
                } // else nothing to do
            }
        }
    });
    // remaining globIdStr is subscribed but not seen in selectors, remove
    // in normal cases this should not occur but do it anyway
    for (const globIdStr of existingGlobIds) {
        // remove
        removeSelector(globIdStr);
        // since this globIdStr is not associated with any selector, dispose and remove cache
        const cache = SelectorFileCache.registry.get(globIdStr);
        if (cache) {
            cache.dispose();
            SelectorFileCache.registry.delete(globIdStr); 
        };
    }
}


// private manipulation functions
function getWatcherGlob(selector: Selector): SelectorGlobPattern {
    return ((selector.target === "Global" || selector.target === "WorkSpace")
        ? selector.globPattern
        : (new RelativePattern(selector.target, selector.globPattern)) as unknown as SelectorGlobPattern
    );
}
async function addSelector(knownWorkspaceFolder: WorkspaceFolder|undefined, glob: SelectorGlobPattern) {
    const globIdStr = getGlobIdString(glob);
    if (!subscriptions.has(globIdStr)) {
        const cache = await SelectorFileCache.getInstance(glob);
        for (const uri of cache.getFileUris()) {
            addFileWithoutFireEvent(uri, knownWorkspaceFolder, globIdStr);
        }
        // listen to file changes
        const createSubscription = cache.onDidFileCreate((created) => {
            addFileAndFireEvent(created, knownWorkspaceFolder, globIdStr);
        });
        const deleteSubscription = cache.onDidFileDelete((deleted) => {
            deleteFile(deleted, knownWorkspaceFolder);
        });
        // add to register
        subscriptions.set(globIdStr, [createSubscription, deleteSubscription]);
        // fire event
        onDidChangeTreeDataEmitter.fire(undefined); // refresh the whole tree
    } // else nothing to do
};
function removeSelector(globIdStr: string) {
    const disposables = subscriptions.get(globIdStr);
    if (disposables) {
        // stop listening, yet keep the cache
        disposables.forEach((d)=>{d.dispose();});
        // remove files
        const nodeWhereDeletionOccurs = root.delChildrenFromGlob(globIdStr);
        // fire the event
        onDidChangeTreeDataEmitter.fire(nodeWhereDeletionOccurs === root ? undefined : nodeWhereDeletionOccurs);
    } // else not subscribed, no action needed
}
function addFileWithoutFireEvent(uri: Uri, knownWorkspaceFolder: WorkspaceFolder | undefined, fromGlobIdStr: string) {
    const relativePath = getRelativePath(uri, knownWorkspaceFolder);
    return root.addFile(uri, fromGlobIdStr, relativePath, 0);
}
function addFileAndFireEvent(uri: Uri, knownWorkspaceFolder: WorkspaceFolder | undefined, fromGlobIdStr: string) {
    const affectedNode = addFileWithoutFireEvent(uri, knownWorkspaceFolder, fromGlobIdStr);
    onDidChangeTreeDataEmitter.fire(affectedNode === root ? undefined : affectedNode);
}


function deleteFile(uri: Uri, knownWorkspaceFolder: WorkspaceFolder | undefined) {
    const relativePath = getRelativePath(uri, knownWorkspaceFolder);
    const affectedNode = root.delFile(relativePath, 0);
    onDidChangeTreeDataEmitter.fire(affectedNode === root ? undefined : affectedNode);
}
function getRelativePath(uri: Uri, knownWorkspaceFolder: WorkspaceFolder | undefined): string {
    const workspaceFolder = knownWorkspaceFolder || workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
    return workspace.asRelativePath(uri, true);
}

