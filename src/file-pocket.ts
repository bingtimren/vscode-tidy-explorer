import { PocketConfiguration, SelectorConfiguration } from "./configuration"
import * as vscode from "vscode"


export class Pocket {
    readonly name: string;
    private selectors_: Selector[] = [];
    get selectors(): readonly Selector[] { return this.selectors_ }
    constructor(readonly config: PocketConfiguration) {
        this.name = config.name;
        this.selectors_ = config.selectors.map((config) => {
            return new Selector(config);
        })
    }
}

export type ValidSelector = Selector & {
    readonly includePattern:  NonNullable<Selector["includePattern"]>;
    readonly error: undefined;
}

/**
 * A Selector for calling vscode.workspace.findFiles or, if only includePattern is provided,
 * for added into "files.exclude" settings
 */
export class Selector {
    readonly includePattern: vscode.GlobPattern | undefined;
    readonly error: string | undefined;
    readonly workspaceFolder : vscode.WorkspaceFolder | undefined;
    readonly basePath : vscode.Uri | undefined;
    private watcher_: vscode.FileSystemWatcher | undefined;
    get watcher() { return this.watcher_; };
    private fileUris_: vscode.Uri[] | undefined;
    get fileUris(): readonly vscode.Uri[] | undefined { return this.fileUris_ };

    /**
     * Constructs an instance. Never throw. 
     * If config is invalid, set error with a message, and includePattern would be undefined.
     * Otherwise includePattern is defined.
     * 
     * @param config 
     */
    constructor(readonly config: SelectorConfiguration) {
        if (config.workspaceFolder) {
            const specifiedFolders = vscode.workspace.workspaceFolders?.filter((wf) => wf.name === config.workspaceFolder);
            if ((!specifiedFolders) || specifiedFolders.length === 0) {
                this.error = "Cannot find the specified workspace folder in workspace";
                return;
            } else
                // construct a relative pattern
                this.workspaceFolder = specifiedFolders[0];
                this.basePath = config.basePath?vscode.Uri.joinPath(this.workspaceFolder.uri, config.basePath):this.workspaceFolder.uri;
                this.includePattern =
                        new vscode.RelativePattern(
                            this.basePath,
                            config.includeGlob);
        } else {
            // no workspace folder, no basePath
            if (config.basePath) {
                this.error = "Selector cannot contain basePath if workspaceFolder is not specified";
            } else {
                this.includePattern = config.includeGlob;
            }

        };
    }

    /**
     * first do a vscode.workspace.findFiles to populate the fileUris, then create the watcher, and 
     * add / remove from the fileUris upon file creation / deletion
     */
    public async watchFiles() {
        const validThis = this.validate();
        validThis.fileUris_ = await vscode.workspace.findFiles(validThis.includePattern);
        validThis.watcher_ = vscode.workspace.createFileSystemWatcher(validThis.includePattern, false, true, false);
        validThis.watcher_.onDidCreate((e) => {
            this.fileUris_?.push(e);
        });
        validThis.watcher_.onDidDelete((e) => {
            const uriStr = e.toString();
            for (let i = 0; i < (this.fileUris_ ? this.fileUris_.length : 0); i++) {
                if (this.fileUris_![i].toString() === uriStr) {
                    this.fileUris_?.splice(i, 1);
                }
            }
        })
    };

    /**
     * 
     * @returns string label for tree-view
     */
    public toString(): string {
        const base = this.config.workspaceFolder ? (
            `(${this.config.workspaceFolder}${this.config.basePath ? `:${this.config.basePath}` : ""}) `
        ) : "";
        const selection = `${base}${this.config.includeGlob}`;
        const isExcluded = this.isExcluded()? "X":"";
        const state = (isExcluded.length>0)? `  [${isExcluded}]`:"";
        return `${selection}${state}`;
    }

    /**
     * 
     * @returns the glob pattern for putting into files.exclude settings
     */
    public toFilesExcludeGlobPattern() : string {
        const validThis = this.validate();
        if (validThis.basePath) {
            return validThis.basePath.path+
             (validThis.basePath.path.endsWith("/")||this.config.includeGlob.startsWith("/"))?"":"/"+
             this.config.includeGlob;
        } else {
            return this.config.includeGlob;
        }
    }

    private validate() : ValidSelector {
        if (isValidSelector(this)) {
            return this;
        };
        throw new Error("Selector is invalid, check error property")
    }

    public isExcluded() : boolean {
        const filesExclude = vscode.workspace.getConfiguration("files.exclude");
        return (filesExclude.get(this.toFilesExcludeGlobPattern()) === true);
    }


}

function isValidSelector(s: Selector) : s is ValidSelector {
    return (s.includePattern !== undefined && s.error === undefined);
}

