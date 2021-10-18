import { ConfigurationTarget, forEachConfigurationTarget, getConfigurationFromTarget, getTargetKey } from "./config-target";
import {SelectorConfiguration} from "./configuration-data-type"
import * as vscode from "vscode";
import { globalState, workspaceState } from "../extension"
import { rawListeners } from "process";
import { FILES_EXCLUDE_KEY } from "../id-keys";
import { defaultExcludePocketName, Pocket } from "./pocket";

/**
 * A Selector for calling vscode.workspace.findFiles or, if only includePattern is provided,
 * for added into "files.exclude" settings
 */

export type SelectorSetting = "hidden" | "inactive" | "display";

export class Selector {

    // Static

    // registry : { targetIdStr : {glob : Selector}}
    private static registry: Map<string, Map<string, Selector>> = new Map();
    public static getSelector(target: ConfigurationTarget, glob: string, create: boolean): Selector|undefined {
        const targetRegistry = Selector.getTargetRegistry(target);
        const existingSelector = targetRegistry.get(glob);
        return ((existingSelector || !create)? 
                existingSelector :
                (
                    () => {
                        const newSelector = new Selector(target, glob);
                        targetRegistry.set(glob, newSelector);
                        return newSelector;
                    })()
            );
    }    
    public static getTargetRegistry(target: ConfigurationTarget): Map<string, Selector>{
        const targetKey = getTargetKey(target);
        const existingTargetRegistry = Selector.registry.get(targetKey);
        if (existingTargetRegistry) {
            return existingTargetRegistry
        } else {
            const newMap = new Map<string, Selector>();
            Selector.registry.set(targetKey, newMap);
            return newMap;
        };
    }

    // static loading

    // selector state comes from two sources:
    //   "hidden" state - all selectors with matching "files.exclude" setting is in hidden state
    //   "display" state - stored in corresponding persistent storage, however "hidden" takes priority

    /**
     * for each configuration target, do:
     *    for each globs in files.exclude, do:
     *       set the corresponding selector's state as "hidden",
     *       if no corresponding selector, create "default excluded files" pocket and set selector in
     */
    public static async loadStateHiddenFromFilesExclude() {
        await forEachConfigurationTarget(async (target)=>{
            const filesExclude = getConfigurationFromTarget<{[glob:string]:boolean}>(target, FILES_EXCLUDE_KEY);
            const defaultExcludeSelectors: SelectorConfiguration[] = [];
            for (const glob of Object.keys(filesExclude||{})){
                const selector = Selector.getSelector(target, glob, false);
                if (selector) {
                    await selector.setSetting("hidden");
                } else {
                    defaultExcludeSelectors.push(glob);
                }
            }
            if (defaultExcludeSelectors.length>0) {
                Pocket.addDefaultExcludePocket(target, defaultExcludeSelectors)
            }
        })
    }

    /**
     * for each target:
     *      get storage from target (global or workspace)
     *      get all keys from storage as a set (selector.idString)
     *      get target selector registry
     *      for each selector entry (glob selector) in registry
     *          if selector.idString in storage keys
     *              selector set state "display" (if not "hidden")
     *              remove selector.idString from key set
     *      for remaining keys in storage key set (that maps no selector)
     *          remove from storage
     */
    public static async loadStateDisplayFromStorage() {
        await forEachConfigurationTarget(async (target)=>{
            const storage = Selector.getStorageFromTarget(target);
            const registry = Selector.getTargetRegistry(target);
            const keys = new Set<string>();
            for (const key in storage.keys) {
                keys.add(key);
            }
            for (const [glob, selector] of registry.entries()){
                const existInStorage = keys.delete(selector.idString);
                if (existInStorage) {
                    if (selector.getSetting()!=='hidden') {
                        // set without triggering persistence
                        selector.setting = "display"
                    }
                }
            }
            // remove remaining keys from storage
            for (const key of keys) {
                await storage.update(key, undefined);
            }
        });
    }

/**
 * first compares selectors settings with actual files.exclude settings, 
 * if no need to set, return false, otherwise set the settings and return true
 */
 public static async setFilesExclude(): Promise<boolean> {
    let filesExcludeWasSet = false;
    await forEachConfigurationTarget(async (target) => {
        const filesExcludeSetting = getConfigurationFromTarget<Object & { [glob: string]: boolean }>(target, FILES_EXCLUDE_KEY);
        // get selectors which setting (not necessarily effective setting) is "hidden"
        const hiddenSelectors = Array.from(Selector.getTargetRegistry(target).values()).filter((selector) => {
            selector.getSetting() === "hidden";
        });
        if (!Selector.compareFilesExcludesWithSelectors(filesExcludeSetting, hiddenSelectors)) {
            // convert array of hidden selectors into files.exclude setting value object
            const targetFilesExcludeSetting = hiddenSelectors.reduce(
                (preValue, selector) => {
                    preValue[selector.globPattern] = true;
                    return preValue;
                }, {} as { [glob: string]: boolean }
            )
            // do setting
            const scopedConfig = vscode.workspace.getConfiguration(
                undefined, typeof target === "string" ? undefined : target);
            const vscodeConfigTarget: vscode.ConfigurationTarget = (
                target === "Global" ? vscode.ConfigurationTarget.Global :
                    (target === "WorkSpace" ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.WorkspaceFolder)
            );
            await scopedConfig.update(FILES_EXCLUDE_KEY, targetFilesExcludeSetting, vscodeConfigTarget);
            filesExcludeWasSet = true;
        }
    });
    return filesExcludeWasSet;
}

/**
 * 
 * @param filesExcludeSetting 
 * @param hiddenSelectors 
 * @returns if filesExcludeSetting matches hiddenSelectors exactly
 */
 private static compareFilesExcludesWithSelectors(
    filesExcludeSetting: (Object & { [glob: string]: boolean }) | undefined,
    hiddenSelectors: Selector[]): boolean {
    if ((filesExcludeSetting ? Object.getOwnPropertyNames(filesExcludeSetting).length : 0) === hiddenSelectors.length) {
        // if both has same size, further examine if all selectors' globs are present 
        for (const selector of hiddenSelectors) {
            if (!(filesExcludeSetting!.hasOwnProperty(selector.globPattern))) {
                return false
            }
        };
        return true;
    } else {
        return false
    }
}


    static getIdString(target: ConfigurationTarget, glob: string): string {
        return typeof (target) === "string" ? `[${target}]...${glob}` : `[${target.uri.toString()}]...${glob}`;
    }

    private static getStorageFromTarget(target: ConfigurationTarget) : vscode.Memento { 
        return target === "Global" ? globalState! : workspaceState! 
    }
    // Instance Construction

    /**
     * If the glob corresponding to this selector is set in the corresponding files.exclude (scoped) setting
     * i.e. hidden in explorer
     */
    readonly idString: string;
    private setting : SelectorSetting;

    private constructor(readonly target: ConfigurationTarget, readonly globPattern: SelectorConfiguration) {
        this.idString = Selector.getIdString(target, globPattern);
        this.setting = "inactive"; // default setting
    };

    // Instance Setting
    public getSetting(): SelectorSetting { return this.setting};
    public async setSetting(setting: SelectorSetting) {
        this.setting = setting;
        if (setting === 'display') {
            await Selector.getStorageFromTarget(this.target).update(this.idString, setting);
        } else {
            await Selector.getStorageFromTarget(this.target).update(this.idString, undefined);
        }
    }
};
