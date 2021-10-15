import * as vscode from "vscode";
import { FILES_EXCLUDE_KEY } from "./id-keys";


/**
 * ViewState is state of display for Explorer and Tidy Explorer, either 
 * current state or target state
 */
export class ViewState {
    private filesExclude : Object & {[idStr:string]: IScopedGlob} = {};
    private  showInTidyExplorer : Object & {[idStr:string]: IScopedGlob} = {};

    public getFilesExcludeFromCurrentConfig(workspaceFolder: vscode.WorkspaceFolder|undefined) {
        const scopedFilesExcludeConfigInspect = vscode.workspace.getConfiguration(undefined, workspaceFolder).inspect(FILES_EXCLUDE_KEY);
        const scopedFilesExcludeConfig = scopedFilesExcludeConfigInspect? (
            workspaceFolder? scopedFilesExcludeConfigInspect.workspaceFolderValue : scopedFilesExcludeConfigInspect.workspaceValue
        ) : undefined
        
    }
}