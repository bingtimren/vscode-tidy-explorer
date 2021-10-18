/**
 * This is the "single source of truth" of the files.excludes & tidy explorer state.
 * "files.exclude" with this extension is used as a tool for the function of this extension. configurations will be over-write
 */

import { Selector } from "../config/selector";
import { Pocket } from "../config/pocket";

// pocket view commands

function itemSelectors(item: Pocket | Selector): readonly Selector[] {
    return item instanceof Pocket ? item.selectors : [item];
}

