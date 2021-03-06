/**
 * A selector is a GlobPattern (https://code.visualstudio.com/api/references/vscode-api#GlobPattern)
 */

export type SelectorConfiguration = string;

export type TidyExplorerConfiguration = {
    pockets: PocketConfiguration[]
};

/**
 * A Pocket is a group of selectors for filtering files, for example, "configurations", "view controllers", "unit tests"
 */
export type PocketConfiguration = {
    name: string,
    selectors: SelectorConfiguration[]
};
