/**
 * A selector is a GlobPattern (https://code.visualstudio.com/api/references/vscode-api#GlobPattern)
 * If workspaceFolder is specified, it must be identical to a "path" in the "folders" settings in the workspace file, and
 * the GlobPattern is a relative pattern (https://code.visualstudio.com/api/references/vscode-api#RelativePattern).
 * If workspaceFolder is not set, basePath should not be set.
 * 
 */

export interface SelectorConfiguration {
    basePath?: string,
    includeGlob: string
}

/**
 * A Pocket is a group of selectors for filtering files, for example, "configurations", "view controllers", "unit tests"
 */
export interface PocketConfiguration {
    name: string,
    selectors: SelectorConfiguration[]
}