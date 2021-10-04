import { Pocket } from "./pocket";
import { Selector } from "./selector";
import {fileViewDataProvider} from "./extension"

/**
 * add the pocket or selector into files.exclude setting
 * @param item
 */

export function cmdAddToFilesExclude(item: Pocket | Selector) {
    item.setFilesExclude(true);
}
;
/**
 * remove the pocket or selector from files.exclude setting
 * @param item
 */

export function cmdRemoveFromFilesExclude(item: Pocket | Selector) {
    item.setFilesExclude(false);
}
;

/**
 * add the pocket or selector into files.exclude setting
 * @param item
 */

export async function cmdAddToTidyView(item: Pocket | Selector) {
    for (const selector of selectors(item)){
        await fileViewDataProvider.addSelector(selector);
    }
}
;
/**
 * remove the pocket or selector from files.exclude setting
 * @param item
 */

export function cmdRemoveFromTidyView(item: Pocket | Selector) {
    for (const selector of selectors(item)){
        fileViewDataProvider.removeSelector(selector);
    }
}
;

function selectors(item: Pocket | Selector) : readonly Selector[] {
    return (item instanceof Pocket? item.selectors : [item])
}