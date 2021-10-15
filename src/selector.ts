import { ConfigurationTarget, SelectorConfiguration, getTargetKey } from "./configuration";
import * as vscode from "vscode";
import { globalState, workspaceState } from "./extension"

/**
 * A Selector for calling vscode.workspace.findFiles or, if only includePattern is provided,
 * for added into "files.exclude" settings
 */

export type SelectorSetting = "hidden" | "inactive" | "display";

export class Selector {

    // Static

    private static registry: Map<string, Map<string, Selector>> = new Map();
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
    public static getSelector(target: ConfigurationTarget, glob: string): Selector {
        const targetRegistry = Selector.getTargetRegistry(target);
        return targetRegistry.get(glob) || (() => {
            const newSelector = new Selector(target, glob);
            targetRegistry.set(glob, newSelector);
            return newSelector;
        })();
    }
    static getIdString(target: ConfigurationTarget, glob: string): string {
        return typeof (target) === "string" ? `[${target}]...${glob}` : `[${target.uri.toString()}]...${glob}`;
    }

    // Instance Construction

    /**
     * If the glob corresponding to this selector is set in the corresponding files.exclude (scoped) setting
     * i.e. hidden in explorer
     */
    readonly idString: string;

    private constructor(readonly target: ConfigurationTarget, readonly globPattern: SelectorConfiguration) {
        this.idString = Selector.getIdString(target, globPattern);
    };

    // Instance Setting
    private get settingStorage(): vscode.Memento { return this.target === "Global" ? globalState! : workspaceState! };
    public getSetting(): SelectorSetting { return this.settingStorage.get<SelectorSetting>(this.idString) || "inactive"};
    public async setSetting(setting: SelectorSetting) {
        await this.settingStorage.update(this.idString, setting);
    }
};
