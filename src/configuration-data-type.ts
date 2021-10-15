import * as vscode from "vscode"
/**
 * A selector is a GlobPattern (https://code.visualstudio.com/api/references/vscode-api#GlobPattern)
 */

export type SelectorConfiguration = string;

/**
 * A Pocket is a group of selectors for filtering files, for example, "configurations", "view controllers", "unit tests"
 */
export type TidyExplorerConfiguration {
    pockets: PocketConfiguration[]
}

export type PocketConfiguration {
    name: string,
    selectors: SelectorConfiguration[]
}

export type ConfigurationTarget = "Global" | "WorkSpace" | vscode.WorkspaceFolder;

/**
 * Call the given function with each configuration target, starting from "Global", 
 * then "WorkSpace", then each workspace folder instance
 * @param action - function to be called
 */
export async function forEachConfigurationTarget(action:(target:ConfigurationTarget)=>void){
    await action("Global");
    await action("WorkSpace");
    for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
        await action(workspaceFolder);
    }
};

export function getTargetKey(target: ConfigurationTarget): string {
    return typeof (target) === "string" ? target : target.uri.toString();
}

export function getConfigurationFromTarget<ConfigValueType>(target: ConfigurationTarget, section: string) {
    const config = vscode.workspace.getConfiguration(undefined, typeof (target) === "string" ? undefined : target);
    const inspect = config.inspect<ConfigValueType>(section);
    switch (target) {
        case "Global": return inspect?.globalValue;
        case "WorkSpace": return inspect?.workspaceValue;
        default: return inspect?.workspaceFolderValue;
    }
}