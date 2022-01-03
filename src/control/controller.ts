/**
 * This is the "single source of truth" of the files.excludes & tidy explorer state.
 * "files.exclude" with this extension is used as a tool for the function of this extension. configurations will be over-write
 */

import { Selector, SelectorSetting } from "../config/selector";
import { Pocket } from "../config/pocket";
import {reload as tidyViewReload, clear as tidyViewClear} from "../tidy-explorer/tidy-view";
import {onDidChangeEmitter as pocketViewChangeEmitter} from "../pocket-view/pocket-view";
import { ConfigurationChangeEvent } from "vscode";
import { TIDY_EXPLORER_CONFIG_KEY, FILES_EXCLUDE_KEY } from "../config/id-keys";
import { SelectorFileCache } from "../tidy-explorer/selector-file-cache";

// pocket view commands

/**
 * 
 * @param item a pocket or a selector
 * @returns the selectors 
 */

function itemSelectors(item: Pocket | Selector): readonly Selector[] {
    return item instanceof Pocket ? item.selectors : [item];
}

/**
 * On extension startup or configuration change
 */
export async function startUp(event?: ConfigurationChangeEvent) {
    if (event && (!
        (event.affectsConfiguration(FILES_EXCLUDE_KEY) || event.affectsConfiguration(TIDY_EXPLORER_CONFIG_KEY))
    )) {
        return; // some config changed but does not affect tidy explorer
    }
    // if files.exclude changes, reset tidy view and the file caches
    if (event && event.affectsConfiguration(FILES_EXCLUDE_KEY)) {
        tidyViewClear();
    };
    // partially or fully reload pocket
    if (event === undefined || event && event.affectsConfiguration(TIDY_EXPLORER_CONFIG_KEY)) {
        Pocket.reload(); // otherwise because config change and only affects files.exclude
    } else {
        Pocket.clearDefaultHidden();
    };
    await Selector.loadStateHiddenFromFilesExclude();
    await Selector.loadStateDisplayFromStorage();
    if (event) {
        pocketViewChangeEmitter.fire();
    }
    await tidyViewReload();
};

export async function setSelectorState(setting: SelectorSetting, item: Pocket|Selector) {
    for (const selector of itemSelectors(item)) {
        await selector.setSetting(setting);
    };
    // does this cause files.exclude change?
    const filesExcludeChanged = await Selector.setFilesExclude();
    if (filesExcludeChanged) {
        return; // a config change event will trigger startUp()
    };
    // no actual files.exclude change, reload "display" states and reload tidyView
    await Selector.loadStateDisplayFromStorage();
    await tidyViewReload();
    pocketViewChangeEmitter.fire();
}
