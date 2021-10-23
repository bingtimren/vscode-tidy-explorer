

import { WorkspaceFolder, Uri, GlobPattern, RelativePattern, FileSystemWatcher, EventEmitter, Event, workspace, Disposable } from "vscode";

export type SelectorGlobPattern = string | Omit<RelativePattern, "base"> & {
    base: WorkspaceFolder
};

/**
 * 
 * @param glob 
 * @returns a string equivalent of a GlobPattern
 */
export function getGlobIdString(glob: SelectorGlobPattern): string {
    const base = typeof (glob) === "string" ? '[G]' : glob.base.uri.toString();
    const pattern = typeof (glob) === "string" ? glob : glob.pattern;
    return `${base}...${pattern}`
}


/**
 * files and source of file create / delete event associated with a selector
 */
export class SelectorFileCache {

    /**
     * {globIdStr : SelectorFileCache instance}  
     **/
    public static registry: Map<string, SelectorFileCache> = new Map();
    /**
     * 
     * @param selector 
     * @returns selector file cache instance, initiated and registered
     */
    public static async getInstance(glob : SelectorGlobPattern) {
        const globIdString = getGlobIdString(glob);
        const existing = SelectorFileCache.registry.get(globIdString);
        if (!existing) {
            const newInstance = new SelectorFileCache(glob);
            await newInstance.init();
            SelectorFileCache.registry.set(globIdString, newInstance);
            return newInstance
        } else {
            return existing
        }
    };
    public static async getInstanceByGlobIdStr(globIdStr : string) {
    }
    /**
     * dispose (un-watch) all file caches, call this after files.exclude changes
     */
    public static resetAndDisposeAll() {
        for (const selectorCache of SelectorFileCache.registry.values()) {
            selectorCache.dispose();
        };
        SelectorFileCache.registry.clear();
    }

    // instance / non-static section
    // private properties
    private filesWatcher: FileSystemWatcher | undefined;
    private onDidFileCreateEmitter: EventEmitter<Uri> = new EventEmitter<Uri>();
    private onDidFileDeleteEmitter: EventEmitter<Uri> = new EventEmitter<Uri>();
    private fileUriRegistry: Map<string, Uri> = new Map();

    // public properties
    /**
     * ([G]|uri)...glob   - identify the watcher glob (global or relative)
     */
    public readonly onDidFileCreate: Event<Uri> = this.onDidFileCreateEmitter.event;
    public readonly onDidFileDelete: Event<Uri> = this.onDidFileDeleteEmitter.event;

    // constructor
    private constructor(readonly watcherGlob: SelectorGlobPattern) {
        // should call init() immediately after construction
    }

    /**
     * first do a workspace.findFiles to populate the fileUris, then create the watcher, and
     * add / remove from the fileUris upon file creation / deletion
     */
     private async init() {
        const foundUris = await workspace.findFiles(this.watcherGlob as GlobPattern);
        for (const uri of (foundUris ? foundUris : [])) {
            this.fileUriRegistry.set(uri.toString(), uri);
        }
        // watch
        this.filesWatcher = workspace.createFileSystemWatcher(this.watcherGlob as GlobPattern, false, true, false);
        this.filesWatcher.onDidCreate(async (uri) => {
            // do a re-find to check if the uri is not filtered out by files.exclude etc.
            const uriWorkspaceFolder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder; // should always find because watcher only watches files under workspace folder
            const uriRelativePath = workspace.asRelativePath(uri, false);
            const uriAsPattern = new RelativePattern(uriWorkspaceFolder, uriRelativePath);
            const recheck = await workspace.findFiles(uriAsPattern, undefined, 1);
            if (recheck.length > 0) {
                // passed re-check, add to uri registry and fire event
                this.fileUriRegistry.set(uri.toString(), uri);
                this.onDidFileCreateEmitter.fire(uri);
            }
            // otherwise ignore create event
        });

        // (vscode API document) Note that when watching for file changes such as '*/.js', notifications will not be sent when a parent folder is moved or deleted 
        // (this is a known limitation of the current implementation and may change in the future).
        this.filesWatcher.onDidDelete((uri) => {
            const deleted = this.fileUriRegistry.delete(uri.toString());
            if (deleted) {
                this.onDidFileDeleteEmitter.fire(uri);
            }
        });
    };
    
    /**
     * files selected by this selector - only defined after watchFiles() has been called
     */
    public getFileUris() {
        return this.fileUriRegistry.values();
    };

    /**
     * dispose watcher, clear registry, to be recycled
     */
    public dispose() {
        this.filesWatcher?.dispose();
        this.fileUriRegistry.clear();
    }

}

