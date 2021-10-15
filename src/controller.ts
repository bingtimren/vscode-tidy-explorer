/**
 * This is the "single source of truth" of the files.excludes & tidy explorer state.
 * "files.exclude" with this extension is used as a tool for the function of this extension. configurations will be over-write
 */

import { Selector } from "./selector";
import * as vscode from "vscode";
import { forEachConfigurationTarget, getConfigurationFromTarget, getTargetKey, PocketConfiguration } from "./configuration-data-type";
import { FILES_EXCLUDE_KEY } from "./id-keys";
import { Pocket } from "./pocket";


/**
 * first compares selectors settings with actual files.exclude settings, 
 * if no need to set, return false, otherwise set the settings and return true
 */
export async function setFilesExclude(): Promise<boolean> {
    let filesExcludeWasSet = false;
    await forEachConfigurationTarget(async (target) => {
        const filesExcludeSetting = getConfigurationFromTarget<Object & { [glob: string]: boolean }>(target, FILES_EXCLUDE_KEY);
        // get selectors which setting (not necessarily effective setting) is "hidden"
        const hiddenSelectors = Array.from(Selector.getTargetRegistry(target).values()).filter((selector) => {
            selector.getSetting() === "hidden";
        });
        if (!compareFilesExcludesWithSelectors(filesExcludeSetting, hiddenSelectors)) {
            const targetFilesExcludeSetting = hiddenSelectors.reduce(
                (preValue, selector) => {
                    preValue[selector.globPattern] = true;
                    return preValue;
                }, {} as Object & { [glob: string]: boolean }
            )
            // do setting
            const scopedConfig = vscode.workspace.getConfiguration(
                undefined, typeof target === "string" ? undefined : target);
            const vscodeConfigTarget: vscode.ConfigurationTarget = (
                target === "Global" ? vscode.ConfigurationTarget.Global :
                    (target === "WorkSpace" ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.WorkspaceFolder)
            );
            await scopedConfig.update(FILES_EXCLUDE_KEY, targetFilesExcludeSetting, vscodeConfigTarget);
            filesExcludeWasSet = true;
        }
    });
    return filesExcludeWasSet;
}

/**
 * 
 * @param filesExcludeSetting 
 * @param hiddenSelectors 
 * @returns if filesExcludeSetting matches hiddenSelectors exactly
 */
function compareFilesExcludesWithSelectors(
    filesExcludeSetting: (Object & { [glob: string]: boolean }) | undefined,
    hiddenSelectors: Selector[]): boolean {
    if ((filesExcludeSetting ? Object.getOwnPropertyNames(filesExcludeSetting).length : 0) === hiddenSelectors.length) {
        // if both has same size, further examine if all selectors' globs are present 
        for (const selector of hiddenSelectors) {
            if (!(filesExcludeSetting!.hasOwnProperty(selector.globPattern))) {
                return false
            }
        };
        return true;
    } else {
        return false
    }
}



// pocket view commands

function itemSelectors(item: Pocket | Selector): readonly Selector[] {
    return item instanceof Pocket ? item.selectors : [item];
}
/**
 * add the pocket or selector into files.exclude setting
 * @param item
 */

export function cmdAddToFilesExclude(item: Pocket | Selector) {
    // set the selectors' setting
    itemSelectors(item).forEach((selector) => {
        selector.setSetting("hidden")
    });
    // compares and set the files.exclude settings
    const wasSet = setFilesExclude();
    // if anything was set reset the tidy explorer data provider
    ......
};

// /**
//  * remove the pocket or selector from files.exclude setting
//  * @param item
//  */

// export function cmdRemoveFromFilesExclude(item: Pocket | Selector) {
//     item.setFilesExclude(false);
// }
// ;

// /**
//  * add the pocket or selector into files.exclude setting
//  * @param item
//  */

// export async function cmdAddToTidyView(item: Pocket | Selector) {
//     for (const selector of selectors(item)) {
//         await fileViewDataProvider.addSelector(selector);
//     }
// }
// ;
// /**
//  * remove the pocket or selector from files.exclude setting
//  * @param item
//  */

// export function cmdRemoveFromTidyView(item: Pocket | Selector) {
//     for (const selector of selectors(item)) {
//         fileViewDataProvider.removeSelector(selector);
//     }
// }
// ;

// function selectors(item: Pocket | Selector): readonly Selector[] {
//     return (item instanceof Pocket ? item.selectors : [item])
// }