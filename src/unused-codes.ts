
    // /**
    //  * Set all selectors in this pocket to hide / un-hide from the explorer (in files.exclude)
    //  * @param include 
    //  */
    // public async setFilesExclude(include: boolean) {
    //     await this.setFilesExcludeForSelectors(this.selectors_, include);
    // }

    // /**
    //  * Set some selectors in this pocket to hide / un-hide
    //  * @param selectors an array of selectors, must be associated with this Pocket
    //  * @param include 
    //  */
    // public async setFilesExcludeForSelectors(selectors: Selector[], include: boolean) {
    //     const scopedRootConfig = vscode.workspace.getConfiguration(undefined, this.workspaceFolder);
    //     const inspectFilesExcludeValue = scopedRootConfig.inspect(FILES_EXCLUDE_KEY);
    //     const existingValues: object = inspectFilesExcludeValue ? (
    //         this.workspaceFolder ? (inspectFilesExcludeValue.workspaceFolderValue as (object | undefined) || {})
    //             : (inspectFilesExcludeValue.workspaceValue as (object | undefined) || {})
    //     ) : {};
    //     const valueToUpdate: { [key: string]: true | undefined } = Object.assign({}, existingValues);
    //     // update the selector globs
    //     for (const selector of selectors) {
    //         if(selector.pocket !== this) {throw new Error("Invalid, selector must be with this pocket")};
    //         valueToUpdate[selector.globPattern] = include ? true : undefined;
    //     };
    //     await scopedRootConfig.update(FILES_EXCLUDE_KEY, valueToUpdate, undefined); // update workspace folder or workspace
    // }
    // public isFilesExcludeAllSet(): boolean | undefined {
    //     const anyTrue = this.selectors.some(s => s.isSetInFilesExcluded);
    //     const anyFalse = this.selectors.some(s => !s.isSetInFilesExcluded);
    //     return anyTrue ? (anyFalse ? undefined : true) : (anyFalse ? false : undefined);
    // }


