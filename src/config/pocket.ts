import { ConfigurationTarget, getConfigurationFromTarget, getTargetKey, forEachConfigurationTarget } from "./config-target"
import { TidyExplorerConfiguration, PocketConfiguration } from "./configuration-data-type"
import {TIDY_EXPLORER_CONFIG_KEY} from "./id-keys"
import { Selector } from "./selector";

export const defaultExcludePocketName = "Default Excludes";

export class Pocket {

    // Static, loading
    /**
     * reload from configurations, without initiating the selector states
     */
    public static reload() {
        Pocket.registry.clear();
        // load pockets from each target
        forEachConfigurationTarget((target) => {
            Pocket.loadFromTarget(target);
        })

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
        targetPocketRegistry.set(defaultExcludePocketName,
            new Pocket(target, {
                name: defaultExcludePocketName,
                selectors: globs
            })
        )
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
        const targetRegistry = Pocket.getPocketRegistry(target);
        // load pocket from configuration from target
        const config = getConfigurationFromTarget<TidyExplorerConfiguration>(target, TIDY_EXPLORER_CONFIG_KEY);
        for (const pocketConfig of config?.pockets || []) {
            targetRegistry.set(pocketConfig.name, new Pocket(target, pocketConfig));
        }

    }

    // Instance Construction
    private constructor(readonly target: ConfigurationTarget, readonly config: PocketConfiguration) {
        this.selectors = config.selectors.map((selectorConfig) => Selector.getSelector(target, selectorConfig, true)!)
    }

    // Instance Properties
    public readonly selectors: readonly Selector[];

}



