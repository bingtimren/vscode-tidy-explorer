import * as vscode from "vscode";

export type ConfigurationTarget = "Global" | "WorkSpace" | vscode.WorkspaceFolder;

/**
 * Call the given function with each configuration target, starting from "Global", 
 * then "WorkSpace", then each workspace folder instance
 * @param action - function to be called
 */
export async function forEachConfigurationTarget(action:(target:ConfigurationTarget)=>void){
    await action("Global");
    await action("WorkSpace");
    if (vscode.workspace.workspaceFile !== undefined){
        for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
            await action(workspaceFolder);
        }
    }
};

/**
 * 
 * @param target 
 * @returns "Global" | "Workspace" | workspace uri string
 */
export function getTargetKey(target: ConfigurationTarget): string {
    return typeof (target) === "string" ? target : target.uri.toString();
}

/**
 * 
 * @param targetKey 
 * @returns the ConfigurationTarget
 */
export function getTargetFromKey(targetKey: string): ConfigurationTarget {
    return ((targetKey === "Global" || targetKey === "WorkSpace") ?   targetKey 
    : vscode.workspace.getWorkspaceFolder( vscode.Uri.parse(targetKey)) as vscode.WorkspaceFolder );
}

/**
 * Get the configuration specific set on the target (not combined)
 * @param target 
 * @param section 
 * @returns 
 */
export function getConfigurationFromTarget<ConfigValueType>(target: ConfigurationTarget, section: string) {
    const config = vscode.workspace.getConfiguration(undefined, typeof (target) === "string" ? undefined : target);
    const inspect = config.inspect<ConfigValueType>(section);
    switch (target) {
        case "Global": return inspect?.globalValue;
        case "WorkSpace": return inspect?.workspaceValue;
        default: return inspect?.workspaceFolderValue;
    }
}