import { PocketConfiguration, SelectorConfiguration } from "./configuration"
import * as vscode from "vscode"
import { FILES_EXCLUDE_KEY } from "./id-keys";

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
    readonly includePattern: NonNullable<Selector["includePattern"]>;
    readonly error: undefined;
}

/**
 * A Selector for calling vscode.workspace.findFiles or, if only includePattern is provided,
 * for added into "files.exclude" settings
 */
export class Selector {
    readonly includePattern: vscode.GlobPattern | undefined;
    readonly error: string | undefined;
    readonly workspaceFolder: vscode.WorkspaceFolder | undefined;
    readonly isFilesExcluded: boolean | undefined;
    readonly filesExcludeGlob: string | undefined;
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
            this.workspaceFolder = this.getWorkspaceFolderFromConfig(config);
            if (!this.workspaceFolder) {
                this.error = `Cannot find workspace folder "${config.workspaceFolder}"`;
                return;
            }
            const findFileRelativeBase = (config.basePath ?
                vscode.Uri.joinPath(this.workspaceFolder.uri, config.basePath) :
                this.workspaceFolder);
            this.includePattern =
                new vscode.RelativePattern(
                    findFileRelativeBase,
                    config.includeGlob);
        } else {
            // no workspace folder, no basePath
            if (config.basePath) {
                this.error = "Selector cannot contain basePath if workspaceFolder is not specified";
                return;
            };
            this.includePattern = config.includeGlob;
        };
        this.filesExcludeGlob = this.getFilesExcludeGlobPattern();
        const filesExclude = this.getScopedConfig(FILES_EXCLUDE_KEY);
        this.isFilesExcluded = (filesExclude[this.filesExcludeGlob] === true);
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
        const isExcluded = this.isFilesExcluded ? "X" : "-";
        return `[${isExcluded}] ${selection}`;
    }

    /**
     * 
     * @returns the glob pattern for putting into files.exclude settings
     */
    private getFilesExcludeGlobPattern(): string {
        const base = this.config.basePath;
        if (base) {
            return (base +
                ((base.endsWith("/") || this.config.includeGlob.startsWith("/")) ? "" : "/") +
                this.config.includeGlob
            );
        } else {
            return this.config.includeGlob;
        }
    }

    private validate(): ValidSelector {
        if (isValidSelector(this)) {
            return this;
        };
        throw new Error("Selector is invalid, check error property")
    }

    public async setFilesExclude(include: boolean) {
        if (this.isFilesExcluded === include) {
            return; // nothing to do, already included/removed
        }
        const scopedConfig = this.getScopedConfig();
        const inspectValue = scopedConfig.inspect(FILES_EXCLUDE_KEY);
        const existingValues: object = inspectValue ? (
            this.workspaceFolder ? (inspectValue.workspaceFolderValue as object | undefined || {})
                : (inspectValue.workspaceValue as object | undefined || {})
        ) : {};
        const valueToUpdate = Object.assign({}, existingValues, {
            [this.getFilesExcludeGlobPattern()]: include?true:undefined
        });
        await scopedConfig.update(FILES_EXCLUDE_KEY, valueToUpdate, undefined); // update workspace folder or workspace
    }

    private getScopedConfig(section?: string) {
        return vscode.workspace.getConfiguration(section, this.workspaceFolder);
    }

    private getWorkspaceFolderFromConfig(config: SelectorConfiguration): vscode.WorkspaceFolder | undefined {
        const specifiedFolders = vscode.workspace.workspaceFolders?.filter((wf) => wf.name === config.workspaceFolder);
        return ((specifiedFolders && specifiedFolders.length > 0) ?
            specifiedFolders[0] : undefined);
    }

}

function isValidSelector(s: Selector): s is ValidSelector {
    return (s.includePattern !== undefined && s.error === undefined);
}

