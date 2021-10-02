import { PocketConfiguration, SelectorConfiguration } from "./configuration"
import * as vscode from "vscode"
import { CONFIG_KEY, FILES_EXCLUDE_KEY } from "./id-keys";

export class Pocket {
    readonly name: string;
    readonly scopedFilesExcludeConfig: vscode.WorkspaceConfiguration;
    private selectors_: Selector[] = [];
    get selectors(): readonly Selector[] { return this.selectors_ }
    constructor(readonly config: PocketConfiguration, readonly workspaceFolder: vscode.WorkspaceFolder | undefined) {
        this.name = config.name;
        this.workspaceFolder = workspaceFolder;
        this.scopedFilesExcludeConfig = vscode.workspace.getConfiguration(FILES_EXCLUDE_KEY, this.workspaceFolder);
        this.selectors_ = config.selectors.map((config) => {
            return new Selector(this, config);
        })
    }

    /**
     * Set all selectors in this pocket to hide / un-hide from the explorer (in files.exclude)
     * @param include 
     */
    public async setFilesExclude(include: boolean) {
        await this.setFilesExcludeForSelectors(this.selectors_, include);
    }

    /**
     * Set some selectors in this pocket to hide / un-hide
     * @param selectors an array of selectors, must be associated with this Pocket
     * @param include 
     */
    public async setFilesExcludeForSelectors(selectors: Selector[], include: boolean) {
        const scopedRootConfig = vscode.workspace.getConfiguration(undefined, this.workspaceFolder);
        const inspectFilesExcludeValue = scopedRootConfig.inspect(FILES_EXCLUDE_KEY);
        const existingValues: object = inspectFilesExcludeValue ? (
            this.workspaceFolder ? (inspectFilesExcludeValue.workspaceFolderValue as (object | undefined) || {})
                : (inspectFilesExcludeValue.workspaceValue as (object | undefined) || {})
        ) : {};
        const valueToUpdate: { [key: string]: true | undefined } = Object.assign({}, existingValues);
        // update the selector globs
        for (const selector of selectors) {
            if(selector.pocket !== this) {throw new Error("Invalid, selector must be with this pocket")};
            valueToUpdate[selector.globPattern] = include ? true : undefined;
        };
        await scopedRootConfig.update(FILES_EXCLUDE_KEY, valueToUpdate, undefined); // update workspace folder or workspace
    }
    public isFilesExcludeAllSet(): boolean | undefined {
        const anyTrue = this.selectors.some(s => s.isSetInFilesExcluded);
        const anyFalse = this.selectors.some(s => !s.isSetInFilesExcluded);
        return anyTrue ? (anyFalse ? undefined : true) : (anyFalse ? false : undefined);
    }


}

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
    get fileUris(): readonly vscode.Uri[] | undefined { return this.fileUris_ };
    /**
     * the workspaceFolder for this selector (from the pocket), or undefined indicating 
     * this selector is defined on a multi-root workspace file 
     * https://code.visualstudio.com/docs/editor/workspaces#_multiroot-workspaces
     */
    get workspaceFolder(): vscode.WorkspaceFolder | undefined { return this.pocket.workspaceFolder };
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
        })
    };


    public async setFilesExclude(include: boolean) {
        this.pocket.setFilesExcludeForSelectors([this], include);
    }

    private getScopedConfig(section?: string) {
        return vscode.workspace.getConfiguration(section, this.workspaceFolder);
    }
}

/**
 * Load pockets from workspace and workspace folder configs
 */
export function pocketInit(): Pocket[] {
    const result: Pocket[] = [];
    // load workspace-folders bound pockets
    for (const wf of (vscode.workspace.workspaceFolders || [])) {
        result.push(...scopedPocketInit(wf));
    }
    // if workspaceFile exists (even unsaved) load workspace-bound pockets
    if (vscode.workspace.workspaceFile) {
        result.push(...scopedPocketInit(undefined));
    }
    return result;
}

function scopedPocketInit(scope: vscode.WorkspaceFolder | undefined): Pocket[] {
    const configInspect = vscode.workspace.getConfiguration(undefined, scope).inspect(CONFIG_KEY);
    if (configInspect) {
        const scopedConfigInspect = scope ? configInspect.workspaceFolderValue : configInspect.workspaceValue;
        const pocketConfigs: PocketConfiguration[] = (scopedConfigInspect as any)?.pockets || [];
        return pocketConfigs.map((pocketConf) => new Pocket(pocketConf, scope));
    } else
        return [];
}