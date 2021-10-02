import { PocketConfiguration } from "./configuration"
import * as vscode from "vscode"
import { CONFIG_KEY, FILES_EXCLUDE_KEY } from "./id-keys";
import { Selector } from "./selector";

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