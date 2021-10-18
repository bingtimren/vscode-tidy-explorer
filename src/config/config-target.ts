
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
    for (const workspaceFolder of vscode.workspace.workspaceFolders || []) {
        await action(workspaceFolder);
    }
};

export function getTargetKey(target: ConfigurationTarget): string {
    return typeof (target) === "string" ? target : target.uri.toString();
}

export function getTargetFromKey(targetKey: string): ConfigurationTarget {
    return (targetKey === "Global" || targetKey === "WorkSpace" ?   targetKey 
    : vscode.workspace.getWorkspaceFolder( vscode.Uri.parse(targetKey)) as vscode.WorkspaceFolder )
}

export function isConfigurationTarget (value: any) : value is ConfigurationTarget {
    return (value === "Global" || value === "Workspace" || (
        value && (typeof value.index === "number" && typeof value.name === "string" && value.uri instanceof vscode.Uri)
    ))
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