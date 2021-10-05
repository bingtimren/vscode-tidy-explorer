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
    readonly idString:string;
    private filesWatcher: vscode.FileSystemWatcher|undefined;
    private onDidFileCreateEmitter: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidFileCreate: vscode.Event<vscode.Uri> = this.onDidFileCreateEmitter.event;
    private onDidFileDeleteEmitter: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidFileDelete: vscode.Event<vscode.Uri> = this.onDidFileDeleteEmitter.event;

    private readonly fileUriRegistry: Object & {[key:string]: vscode.Uri} = {};

    /**
     * files selected by this selector - only defined after watchFiles() has been called
     */
    public async getFileUris(): Promise<readonly vscode.Uri[]> { 
        await this.watchFiles();
        return Object.values(this.fileUriRegistry); 
    };

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
        this.idString = `${pocket.name}::${this.pocket.workspaceFolder?.uri.toString()||"[G]"}::${globPattern}`;
    }


    /**
     * first do a vscode.workspace.findFiles to populate the fileUris, then create the watcher, and
     * add / remove from the fileUris upon file creation / deletion
     */
    async watchFiles() {
        // the pattern for findFile, be a relative-pattern if selector is on a workspace folder, otherwise a global pattern
        const includePattern : vscode.GlobPattern =  this.workspaceFolder ? new vscode.RelativePattern(this.workspaceFolder, this.globPattern) : this.globPattern;
        const foundUris = await vscode.workspace.findFiles(includePattern);
        for (const uri of (foundUris?foundUris:[])){
            this.fileUriRegistry[uri.toString()] = uri;
        }
        // watch
        this.filesWatcher = vscode.workspace.createFileSystemWatcher(includePattern, false, true, false);
        this.filesWatcher.onDidCreate(async (uri) => {
            // do a find to check if the uri is not filtered out by files.exclude etc.
            const uriWorkspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
            const uriRelativePath = vscode.workspace.asRelativePath(uri);
            const uriAsPattern = uriWorkspaceFolder? new vscode.RelativePattern(uriWorkspaceFolder, uriRelativePath):uri.path
            const recheck = await vscode.workspace.findFiles(uriAsPattern, undefined, 1);
            if (recheck.length>0){
                // passed re-check, add to uri registry and fire event
                this.fileUriRegistry[uri.toString()] = uri;
                this.onDidFileCreateEmitter.fire(uri);
            }
            // otherwise ignore create event
        });
        this.filesWatcher.onDidDelete((uri) => {
            const uriStr = uri.toString();
            if (this.fileUriRegistry.hasOwnProperty(uriStr)) {
                delete this.fileUriRegistry[uriStr];
                this.onDidFileDeleteEmitter.fire(uri);
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
};
