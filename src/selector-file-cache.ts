

import * as vscode from "vscode";
import { Selector } from "./selector";


export class SelectorFileCache {
    // static
    


    // private properties
    private filesWatcher: vscode.FileSystemWatcher | undefined;
    private onDidFileCreateEmitter: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    private onDidFileDeleteEmitter: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
    private fileUriRegistry: Map<string, vscode.Uri> | undefined;

    // public properties
    readonly idString: string;
    readonly workspaceFolder: vscode.WorkspaceFolder | undefined;
    readonly glob: string;
    readonly onDidFileCreate: vscode.Event<vscode.Uri> = this.onDidFileCreateEmitter.event;
    readonly onDidFileDelete: vscode.Event<vscode.Uri> = this.onDidFileDeleteEmitter.event;

    // constructor
    private constructor(selector: Selector) {
        this.workspaceFolder = typeof selector.target === "string" ? undefined : selector.target;
        this.glob = selector.globPattern;
        this.idString = `${this.workspaceFolder?.uri.toString() || '[G]'}...${this.glob}`;
    }

    // public methods
    /**
     * files selected by this selector - only defined after watchFiles() has been called
     */
    public async getFileUris() {
        if (!this.fileUriRegistry) {
            this.fileUriRegistry = new Map();
            await this.init();
        }
        return this.fileUriRegistry.values();
    };



    /**
     * first do a vscode.workspace.findFiles to populate the fileUris, then create the watcher, and
     * add / remove from the fileUris upon file creation / deletion
     */
    public async init() {
        // the pattern for findFile, be a relative-pattern if selector is on a workspace folder, otherwise a global pattern
        const includePattern: vscode.GlobPattern = (this.workspaceFolder ?
            new vscode.RelativePattern(this.workspaceFolder, this.glob) :
            this.glob
        );
        const foundUris = await vscode.workspace.findFiles(includePattern);
        for (const uri of (foundUris ? foundUris : [])) {
            this.fileUriRegistry!.set(uri.toString(), uri);
        }
        // watch
        this.filesWatcher = vscode.workspace.createFileSystemWatcher(includePattern, false, true, false);
        this.filesWatcher.onDidCreate(async (uri) => {
            // do a find to check if the uri is not filtered out by files.exclude etc.
            const uriWorkspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
            const uriRelativePath = vscode.workspace.asRelativePath(uri, false);
            const uriAsPattern = uriWorkspaceFolder ? new vscode.RelativePattern(uriWorkspaceFolder, uriRelativePath) : uri.path
            const recheck = await vscode.workspace.findFiles(uriAsPattern, undefined, 1);
            if (recheck.length > 0) {
                // passed re-check, add to uri registry and fire event
                this.fileUriRegistry!.set(uri.toString(), uri);
                this.onDidFileCreateEmitter.fire(uri);
            }
            // otherwise ignore create event
        });

        // (vscode API document) Note that when watching for file changes such as '*/.js', notifications will not be sent when a parent folder is moved or deleted 
        // (this is a known limitation of the current implementation and may change in the future).
        this.filesWatcher.onDidDelete((uri) => {
            const deleted = this.fileUriRegistry!.delete(uri.toString());
            if (deleted) {
                this.onDidFileDeleteEmitter.fire(uri);
            }
        });
    };
}

