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

/**
 * A Selector for calling vscode.workspace.findFiles or, if only includePattern is provided,
 * for added into "files.exclude" settings
 */
export class Selector {
    readonly includePattern: vscode.GlobPattern | undefined;
    readonly error: string | undefined;
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
                if (config.basePath) {
                    const wfUri = specifiedFolders[0].uri;
                    this.includePattern =
                        new vscode.RelativePattern(
                            vscode.Uri.joinPath(wfUri, config.basePath),
                            config.includeGlob);
                } else {
                    this.includePattern = new vscode.RelativePattern(
                        specifiedFolders[0], config.includeGlob
                    );
                }
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
        if (this.includePattern === undefined) {
            throw new Error("invalid state, check error property")
        }
        this.fileUris_ = await vscode.workspace.findFiles(this.includePattern);
        this.watcher_ = vscode.workspace.createFileSystemWatcher(this.includePattern, false, true, false);
        this.watcher_.onDidCreate((e) => {
            this.fileUris_?.push(e);
        });
        this.watcher_.onDidDelete((e) => {
            const uriStr = e.toString();
            for (let i = 0; i < (this.fileUris_ ? this.fileUris_.length : 0); i++) {
                if (this.fileUris_![i].toString() === uriStr) {
                    this.fileUris_?.splice(i, 1);
                }
            }
        })
    };


    public toString(): string {
        const base = this.config.workspaceFolder ? (
            `(${this.config.workspaceFolder}${this.config.basePath ? `:${this.config.basePath}` : ""}) `
        ) : "";
        return `${base}${this.config.includeGlob}`;
    }
}