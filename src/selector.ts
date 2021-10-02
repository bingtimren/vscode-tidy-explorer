import { SelectorConfiguration } from "./configuration";
import * as vscode from "vscode";
import { Pocket } from "./pocket";

/**
 * A Selector for calling vscode.workspace.findFiles or, if only includePattern is provided,
 * for added into "files.exclude" settings
 */

export class Selector {

    /**
     * If the glob corresponding to this selector is set in the corresponding files.exclude (scoped) setting
     * i.e. hidden in explorer
     */
    readonly isSetInFilesExcluded: boolean;
    private filesWatcher_: vscode.FileSystemWatcher | undefined;
    get filesWatcher(): vscode.FileSystemWatcher | undefined { return this.filesWatcher_; };
    private fileUris_: vscode.Uri[] | undefined;

    /**
     * files selected by this selector - only defined after watchFiles() has been called
     */
    get fileUris(): readonly vscode.Uri[] | undefined { return this.fileUris_; };
    /**
     * the workspaceFolder for this selector (from the pocket), or undefined indicating
     * this selector is defined on a multi-root workspace file
     * https://code.visualstudio.com/docs/editor/workspaces#_multiroot-workspaces
     */
    get workspaceFolder(): vscode.WorkspaceFolder | undefined { return this.pocket.workspaceFolder; };
    /**
     * Constructs an instance. Never throw.
     * If config is invalid, set error with a message, and includePattern would be undefined.
     * Otherwise includePattern is defined.
     *
     * @param config
     */
    constructor(readonly pocket: Pocket, readonly globPattern: SelectorConfiguration) {
        this.isSetInFilesExcluded = (pocket.scopedFilesExcludeConfig[this.globPattern] === true);
    }

    get includeGlobPatternForFindFile(): vscode.GlobPattern {
        // if this selector is bound to a workspace, construct a relative-pattern, otherwise a global pattern (string)
        // https://code.visualstudio.com/api/references/vscode-api#RelativePattern
        // https://code.visualstudio.com/api/references/vscode-api#GlobPattern
        return (this.workspaceFolder ? new vscode.RelativePattern(this.workspaceFolder, this.globPattern) : this.globPattern);
    };

    /**
     * first do a vscode.workspace.findFiles to populate the fileUris, then create the watcher, and
     * add / remove from the fileUris upon file creation / deletion
     */
    public async watchFiles() {
        const includePattern = this.includeGlobPatternForFindFile;
        this.fileUris_ = await vscode.workspace.findFiles(includePattern);
        this.filesWatcher_ = vscode.workspace.createFileSystemWatcher(includePattern, false, true, false);
        this.filesWatcher_.onDidCreate((e) => {
            this.fileUris_?.push(e);
        });
        this.filesWatcher_.onDidDelete((e) => {
            const uriStr = e.toString();
            for (let i = 0; i < (this.fileUris_ ? this.fileUris_.length : 0); i++) {
                if (this.fileUris_![i].toString() === uriStr) {
                    this.fileUris_?.splice(i, 1);
                }
            }
        });
    };

    /**
     * set or unset this selector's glob in the corresponding (workspace or workspace-folder) files.exclude setting
     * @param setInFilesExclude 
     */
    public async setFilesExclude(setInFilesExclude: boolean) {
        this.pocket.setFilesExcludeForSelectors([this], setInFilesExclude);
    }
}
