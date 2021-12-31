import { ConfigurationTarget, forEachConfigurationTarget, getConfigurationFromTarget, getTargetKey } from "./config-target";
import { SelectorConfiguration } from "./configuration-data-type";
import * as vscode from "vscode";
import { globalState, workspaceState } from "../extension";
import { FILES_EXCLUDE_KEY } from "./id-keys";
import { Pocket } from "./pocket";

/**
 * A Selector for calling vscode.workspace.findFiles or, if only includePattern is provided,
 * for added into "files.exclude" settings
 * 
 * "hidden" - added into 'files.exclude'
 * "inactive" - no action
 * "display" - added into "tidy explorer"
 * "hidden-by-default" - hidden by "default excludes"
 * "display-by-inheritance" - display because of inheritance
 */

export type SelectorSetting = "hidden" | "inactive" | "display";

export class Selector {
    /**
     * clear registry
     */
    static clear() {
        Selector.registry.clear();
    }

    /**
     * clear all "default hidden" selectors
     */
    static clearDefaultHiddenSelectors() {
        Selector.registry.forEach((subRegistry, targetKey)=>{
            subRegistry.forEach((selector, key)=>{
                if (selector.getSetting() === "hidden" && selector.isDefaultHidden) {
                    subRegistry.delete(key);
                }
            });
        });
    }

    // Static

    // registry : { configurationTarget-key : {glob : Selector}}
    private static registry: Map<string, Map<string, Selector>> = new Map();
    /**
     * 
     * @param target 
     * @param glob 
     * @param create : retrieve-only or retrieve-create
     * @returns 
     */

    public static getSelector(target: ConfigurationTarget, glob: string, create: boolean): Selector | undefined {
        const targetRegistry = Selector.getRegistryByTarget(target);
        const existingSelector = targetRegistry.get(glob);
        return ((existingSelector || !create) ?
            existingSelector :
            (
                () => {
                    const newSelector = new Selector(target, glob);
                    targetRegistry.set(glob, newSelector);
                    return newSelector;
                })()
        );
    }

    /**
     * retrieve (or create) the selector registry
     * @param target 
     * @returns {glob : Selector}
     */
    public static getRegistryByTarget(target: ConfigurationTarget): Map<string, Selector> {
        const targetKey = getTargetKey(target);
        const existingTargetRegistry = Selector.registry.get(targetKey);
        if (existingTargetRegistry) {
            return existingTargetRegistry;
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
    //   "inactive" - otherwise

    /**
     * selectors' "hidden" state comes from "files.exclude" setting
     * 
     * for each configuration target, do:
     *    fetch the globs in files.exclude as a set
     *    get the selectors
     *    for each the selectors, do:
     *       remove from files.exclude globs from the set
     *       if selector in files.exclude:
     *          set "hidden"
     *       else
     *          if was "hidden" - change to "inactive"
     *       
     *    for remaining globs in files.exclude set, do:
     *       if no corresponding selector, create "default excluded files" pocket and set selector in
     */
    public static async loadStateHiddenFromFilesExclude() {
        await forEachConfigurationTarget(async (target) => {
            const filesExclude = new Set(Object.keys(getConfigurationFromTarget<{ [glob: string]: boolean }>(target, FILES_EXCLUDE_KEY)||{}));
            for (const [glob, selector] of Selector.getRegistryByTarget(target)){
                const excluded = filesExclude.delete(glob);
                if (excluded) {
                    if (selector.getSetting() !== "hidden") {
                        await selector.setSetting("hidden");
                    }
                } else {
                    if (selector.getSetting() === "hidden") {
                        await selector.setSetting("inactive");
                    };
                }
            }            
            if (filesExclude.size > 0) {
                Pocket.addDefaultExcludePocket(target, Array.from(filesExclude));
            }
        });
    }

    /**
     * selectors' "display" state comes from persistent storage
     * 
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
        await forEachConfigurationTarget(async (target) => {
            const storage = Selector.getStorageFromTarget(target);
            const registry = Selector.getRegistryByTarget(target);
            const storageKeys = new Set<string>();
            for (const key in storage.keys) {
                storageKeys.add(key);
            }
            // check all registry entries, deletes key from storage keys, and set 'display' state
            for (const [glob, selector] of registry.entries()) {
                const existInStorage = storageKeys.delete(selector.idString);
                if (existInStorage) {
                    if (selector.getSetting() !== 'hidden') {
                        // set without triggering persistence
                        selector.setting = "display";
                    } else {
                        await storage.update(selector.idString, undefined);
                    }
                }
            }
            // remove remaining keys from storage
            for (const key of storageKeys) {
                await storage.update(key, undefined);
            }
        });
    }

    /**
     * this updates files.exclude settings from selectors' states
     * 
     * first compares selectors settings with actual files.exclude settings, 
     * if no need to set, return false, otherwise set the settings and return true
     * 
     * @returns if any files.exclude setting is actually updated
     */
    public static async setFilesExclude(): Promise<boolean> {
        let filesExcludeWasSet = false;
        await forEachConfigurationTarget(async (target) => {
            const filesExcludeSetting = getConfigurationFromTarget<Object & { [glob: string]: boolean }>(target, FILES_EXCLUDE_KEY);
            // get selectors which setting (not necessarily effective setting) is "hidden"
            const hiddenSelectors = Array.from(Selector.getRegistryByTarget(target).values()).filter((selector) => 
                (selector.getSetting() === "hidden")
            );
            if (!Selector.compareFilesExcludesWithSelectors(filesExcludeSetting, hiddenSelectors)) {
                // convert array of hidden selectors into files.exclude setting value object
                const targetFilesExcludeSetting = hiddenSelectors.reduce(
                    (preValue, selector) => {
                        preValue[selector.globPattern] = true;
                        return preValue;
                    }, {} as { [glob: string]: boolean }
                );
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
                    return false;
                }
            };
            return true;
        } else {
            return false;
        }
    }


    static getIdString(target: ConfigurationTarget, glob: string): string {
        return typeof (target) === "string" ? `[${target}]...${glob}` : `[${target.uri.toString()}]...${glob}`;
    }
    private static getStorageFromTarget(target: ConfigurationTarget): vscode.Memento {
        return target === "Global" ? globalState! : workspaceState!;
    }
    // Instance Construction

    /**
     * If the glob corresponding to this selector is set in the corresponding files.exclude (scoped) setting
     * i.e. hidden in explorer
     */
    readonly idString: string;
    private setting: SelectorSetting;
    private _defaultHidden: boolean;
    public get isDefaultHidden() {return this._defaultHidden};

    private constructor(readonly target: ConfigurationTarget, readonly globPattern: SelectorConfiguration) {
        this.idString = Selector.getIdString(target, globPattern);
        this.setting = "inactive"; // default setting
        this._defaultHidden = false;
    };

    // Instance Setting
    public getSetting(): SelectorSetting { return this.setting; };
    /**
     * set setting, however only persist "display" setting
     * @param setting 
     */
    public async setSetting(setting: SelectorSetting) {
        this.setting = setting;
        if (setting === 'display') {
            await Selector.getStorageFromTarget(this.target).update(this.idString, setting);
        } else {
            await Selector.getStorageFromTarget(this.target).update(this.idString, undefined);
        }
    }
    public setDefaultHidden() {
        if (this.setting !== "inactive") {
            throw new Error("Hidden-by-default should transit from 'inactive' only");
        }
        this.setting = "hidden";
        this._defaultHidden = true;
    }
    public getEffectiveSetting() : SelectorSetting {
        if (this.target === "Global") {
            return this.getSetting(); // no overriding issue
        }
        const globalParentSetting = Selector.getSelector("Global", this.globPattern, false)?.getSetting();
        if (this.target === "WorkSpace") {
            // rule 1: "hidden" overrides
            if (globalParentSetting==="hidden" || this.getSetting() === "hidden") {
                return "hidden";
            };
            // otherwise "display" overrides potential "inactive"
            if (globalParentSetting==="display") {
                return "display";
            }; // no need for workspace-level "display" - the same
            // global undefined or inactive
            return this.getSetting();
        }
        // this.target is workspace folder
        const workspaceLevelEffectiveSetting = (Selector.getSelector("WorkSpace", this.globPattern, false)?.getEffectiveSetting()) || globalParentSetting;
        // rule 1: if workspace-level hidden - hidden
        if (workspaceLevelEffectiveSetting === "hidden") {return "hidden";} // hidden setting overrides 
        // rule 2: if workspace-level display, depends on self (more specific)
        if (workspaceLevelEffectiveSetting === "display" && this.getSetting()==="inactive") {
            return "display"; // self "inactive" effectively "display"
        };
        // rule 3: if workspace-level inactive or no selector, use self setting
        return this.getSetting();
    }
    public getWorkspaceFolder() : vscode.WorkspaceFolder | undefined {
        return typeof (this.target) === "string" ? undefined : this.target;
    }

};
