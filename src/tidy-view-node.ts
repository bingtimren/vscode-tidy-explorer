import { Uri, workspace } from "vscode";
import { returnNextSeparatorAndName } from "./tidy-view";

export class UriNode {
    readonly children: Object & { [key: string]: UriNode; } | undefined;
    private readonly fromSelectors: Set<string> = new Set<string>();
    public static createRoot() : UriNode {
        return new UriNode(null,null,"ROOT",false);
    }
    get isRoot():boolean {return this.uri === null};
    private constructor(readonly uri: Uri | null, fromSelector: string|null, readonly name: string, isLeaf: boolean) {
        if (!isLeaf) {
            this.children = {};
        };
        if (fromSelector != null) {
            this.fromSelectors.add(fromSelector);
        } // otherwise if fromSelector is null, meaning is the root
    }


    /**
     * Add a uri into the subtree starting from this node.
     * Assumptions:
     * - this node is not a leaf, in normal operation no file uri contains children
     * - the last char of the relativePath is not PATH_SEPARATOR, only files are added
     *
     * @param parentUri - uri of the parent of this node (the caller)
     * @param fileUri - the uri of the file (must not ends with PATH_SEPARATOR)
     * @param relativePath - the relative path of the fileUri relative to the workspace-folder
     * @param startPosition - the starting position, must be the last PATH_SEPARATOR + 1
     *
     * @returns the immediate parent node of the finally added UriNode, i.e. the new node is added to its .children
     *          the return result is appropriate to be passed as the change event value
     *          if the fileUri already exists, will return undefined - as no node is affected
     */
    public addFile(fileUri: Uri, fromSelector: string, relativePath: string, startPosition: number): UriNode | undefined {
        // parent is responsible for setting children's "fromSelector", and no one set root's (not required)
        // find out position of next separator and the name of next segment
        const [nextSeparator, name] = returnNextSeparatorAndName(relativePath, startPosition);
        // find out if the path has been created already
        const existingChild = this.children![name];
        // otherwise create the child node
        const newChild = existingChild? undefined : this.addNewChild(fileUri, fromSelector, name, nextSeparator<0);
        const theChild = existingChild || newChild;
        theChild.fromSelectors.add(fromSelector);
        if (nextSeparator<0) {
            return existingChild? undefined : this; // if an existing leaf node, no affection since just add a selector to an existing file, otherwise return this (where insertion starts)
        } else {
            // still needs to go down the path
            const childrenAffected = theChild.addFile(fileUri, fromSelector, relativePath, nextSeparator+1 );
            return existingChild? childrenAffected : this; // if is an existing child, return the affected children, otherwise return this (where insertion starts)
        }
    }

    private addNewChild(fileUri: Uri, fromSelector:string, name:string, isLeaf:boolean) {
        const newChild = new UriNode(
            this.uri? (isLeaf ? fileUri : Uri.joinPath(this.uri, name)) : // not workspace-folder, then either file or dir
                workspace.getWorkspaceFolder(fileUri)!.uri, // the workspace folder
            fromSelector,
            name,
            isLeaf // is leaf - if no more separator
        );
        this.children![name] = newChild;
        return newChild;
    }

    /**
     * Delete a leaf child, possibly also delete a parent if the parent is left empty
     * @param relativePath - the relative path of a file uri, relative to the workspace-folder
     * @param startPosition - the start position, must be the last PATH_SEPARATOR + 1
     * @returns the immediate parent node of the finally deleted UriNode
     */
    public delFile(relativePath: string, startPosition: number): UriNode | undefined {
        const [nextSeparator, name] = returnNextSeparatorAndName(relativePath, startPosition);
        // check in case already deleted
        const downPathChild = this.children![name];
        if (! downPathChild) {
            return undefined; // already deleted, no effect
        }
        if (nextSeparator < 0) {
            delete this.children![name]; // delete the leaf
            return this; // and this node is where deletion starts
        } else { // ask the child to delete 
            const affectedChild = downPathChild.delFile(relativePath, nextSeparator + 1);
            if (Object.keys(downPathChild.children!).length == 0) {
                // left an empty down-path child, delete as well
                delete this.children![name];
                return this;
            } else {
                return affectedChild;
            }
        }
    }

    
    public delChildrenFromSelector(selector: string) : UriNode | undefined  {
        let nodeAffected : UriNode | undefined = undefined;
        for (const [childKey, childNode] of Object.entries(this.children || [])) {
            if (childNode.fromSelectors.delete(selector)) { // so childNode was at least partially from selector
                // if childNode not only from this but also other selector, go down the path and find the affected node (where deletion occurs)
                // otherwise undefined
                const childNodeAffected = (childNode.fromSelectors.size>0? childNode.delChildrenFromSelector(selector):undefined);
                if (childNode.fromSelectors.size===0 || (childNode.children && (Object.keys(childNode.children).length === 0))) {
                    // for whatever reason the childNode now has no selector source, or is a non-leaf none-children node
                    delete this.children![childKey];
                    nodeAffected = this; // "this" is where deletion occurs
                } 
                // if already a node is affected, then (if this child is affected, "this" is affected as the common root, otherwise if this child not affected, keep the same)
                // if no previous node affected, then see this child
                nodeAffected = nodeAffected? (childNodeAffected? this: nodeAffected) : childNodeAffected; 
            }
        }
        return nodeAffected;
    }
}
