import { SelectorFileCache } from "../tidy-explorer/selector-file-cache";
import { ConfigurationTarget, getConfigurationFromTarget, getTargetKey, forEachConfigurationTarget } from "./config-target";
import { TidyExplorerConfiguration, PocketConfiguration } from "./configuration-data-type";
import { TIDY_EXPLORER_CONFIG_KEY } from "./id-keys";
import { Selector } from "./selector";

export const defaultExcludePocketName = "Un-managed Excludes";

export class Pocket {
    isDefaultExclude() {
        return this.config.name === defaultExcludePocketName;
    }

    // Static, loading
    /**
     * reload from configurations, without initiating the selector states
     */
    public static reload() {
        Pocket.registry.clear();
        Selector.clear();
        // load pockets from each target
        forEachConfigurationTarget((target) => {
            Pocket.loadFromTarget(target);
        });

    }

    /**
     * clear "default hidden" pockets and the selectors
     */
    public static clearDefaultHidden() {
        Pocket.registry.forEach((subRegistry, targetKey)=>{
            subRegistry.delete(defaultExcludePocketName);
        });
        Pocket.registry.forEach((subRegistry, targetKey)=>{
            if (subRegistry.size === 0) {
                Pocket.registry.delete(targetKey);
            }
        });
        Selector.clearDefaultHiddenSelectors();        
    }
    /**
     * {
     *     [configurationTarget key] : {
     *          [name]: Pocket
     *      }
     * }
     */
    public static readonly registry: Map<string, Map<string, Pocket>> = new Map();

    /**
     * default exclude pocket represents those globs found in files.exclude settings in a target, but does not correspond to any selector in any pocket
     * these globs are set by default or by user but tidy explorer would only display but not control it
     * @param target 
     * @param globs 
     */
    public static addDefaultExcludePocket(target: ConfigurationTarget, globs: string[]) {
        const targetPocketRegistry = Pocket.getPocketRegistry(target);
        const defaultExcludePocket = new Pocket(target, {
            name: defaultExcludePocketName,
            selectors: globs
        });
        defaultExcludePocket.selectors.forEach((selector)=>{selector.setDefaultHidden();});
        targetPocketRegistry.set(defaultExcludePocketName, defaultExcludePocket);
    }

    private static getPocketRegistry(target: ConfigurationTarget) {
        // obtain registry instance
        const targetKey = getTargetKey(target);
        return Pocket.registry.get(targetKey) || (() => {
            const newMap = new Map<string, Pocket>();
            Pocket.registry.set(targetKey, newMap);
            return newMap;
        })();
    }
    private static loadFromTarget(target: ConfigurationTarget) {
        const config = getConfigurationFromTarget<TidyExplorerConfiguration>(target, TIDY_EXPLORER_CONFIG_KEY);
        if (config) {
            const targetRegistry = Pocket.getPocketRegistry(target);
            for (const pocketConfig of config?.pockets || []) {
                targetRegistry.set(pocketConfig.name, new Pocket(target, pocketConfig));
            }
        }
    }

    // Instance Construction
    private constructor(readonly target: ConfigurationTarget, readonly config: PocketConfiguration) {
        this.selectors = config.selectors.map((selectorConfig) => Selector.getSelector(target, selectorConfig, true)!);
    }

    // Instance Properties
    public readonly selectors: readonly Selector[];

}



