import { TidyExplorerConfiguration, ConfigurationTarget, getConfigurationFromTarget, PocketConfiguration, getTargetKey, forEachConfigurationTarget  } from "./configuration"
import * as vscode from "vscode"
import { CONFIG_KEY, FILES_EXCLUDE_KEY } from "./id-keys";
import { Selector } from "./selector";



export class Pocket {

    // Static, loading


    /**
     * reload from configurations
     */
    public static reload() {
        Pocket.registry.clear();
        forEachConfigurationTarget((target)=>{
            Pocket.loadFromTarget(target);
        })

    }

    public static readonly registry : Map<string, Map<string, Pocket>> = new Map();
    private static loadFromTarget(target: ConfigurationTarget) {
        const targetKey = getTargetKey(target);
        const targetRegistry = Pocket.registry.get(targetKey) || (()=>{
            const newMap = new Map<string, Pocket>();
            Pocket.registry.set(targetKey, newMap);
            return newMap;
        })();
        // load
        const config = getConfigurationFromTarget<TidyExplorerConfiguration>(target, CONFIG_KEY);
        for (const pocketConfig of config?.pockets || []) {
            targetRegistry.set(pocketConfig.name, new Pocket(target, pocketConfig));
        }

    }

   
    // Instance Construction


    private constructor(readonly target: ConfigurationTarget, readonly config: PocketConfiguration) {
        // this.scopedFilesExcludeConfig = vscode.workspace.getConfiguration(FILES_EXCLUDE_KEY, this.workspaceFolder);
        this.selectors = config.selectors.map((selectorConfig) => Selector.getSelector(target, selectorConfig))
    }

    // Instance Properties
    public readonly selectors: readonly Selector[];


    // /**
    //  * Set all selectors in this pocket to hide / un-hide from the explorer (in files.exclude)
    //  * @param include 
    //  */
    // public async setFilesExclude(include: boolean) {
    //     await this.setFilesExcludeForSelectors(this.selectors_, include);
    // }

    // /**
    //  * Set some selectors in this pocket to hide / un-hide
    //  * @param selectors an array of selectors, must be associated with this Pocket
    //  * @param include 
    //  */
    // public async setFilesExcludeForSelectors(selectors: Selector[], include: boolean) {
    //     const scopedRootConfig = vscode.workspace.getConfiguration(undefined, this.workspaceFolder);
    //     const inspectFilesExcludeValue = scopedRootConfig.inspect(FILES_EXCLUDE_KEY);
    //     const existingValues: object = inspectFilesExcludeValue ? (
    //         this.workspaceFolder ? (inspectFilesExcludeValue.workspaceFolderValue as (object | undefined) || {})
    //             : (inspectFilesExcludeValue.workspaceValue as (object | undefined) || {})
    //     ) : {};
    //     const valueToUpdate: { [key: string]: true | undefined } = Object.assign({}, existingValues);
    //     // update the selector globs
    //     for (const selector of selectors) {
    //         if(selector.pocket !== this) {throw new Error("Invalid, selector must be with this pocket")};
    //         valueToUpdate[selector.globPattern] = include ? true : undefined;
    //     };
    //     await scopedRootConfig.update(FILES_EXCLUDE_KEY, valueToUpdate, undefined); // update workspace folder or workspace
    // }
    // public isFilesExcludeAllSet(): boolean | undefined {
    //     const anyTrue = this.selectors.some(s => s.isSetInFilesExcluded);
    //     const anyFalse = this.selectors.some(s => !s.isSetInFilesExcluded);
    //     return anyTrue ? (anyFalse ? undefined : true) : (anyFalse ? false : undefined);
    // }


}



