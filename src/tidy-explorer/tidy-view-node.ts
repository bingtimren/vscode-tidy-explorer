import { Uri, workspace } from "vscode";
import { returnNextSeparatorAndName } from "./utils";

/**
 * Tree node for tidy-explorer view, a node represents a Uri, either a directory or a file, except for root
 * The immediate level of nodes under root represents workspace folders
 * 
 */
export class UriNode {
    /**
     * for directory node, children nodes, or undefined for file node
     */
    readonly children: Map<string, UriNode>  | undefined;
    // a set of globs id strings representing the source of the code
    private readonly fromGlobs: Set<string> = new Set<string>();
    /**
     * 
     * @returns root of a new tree
     */
    public static createRoot() : UriNode {
        return new UriNode(null,null,"ROOT",false);
    }
    get isRoot():boolean {return this.uri === null;};
    private constructor(readonly uri: Uri | null, fromGlob: string|null, readonly name: string, isLeaf: boolean) {
        if (!isLeaf) {
            this.children = new Map();
        };
        if (fromGlob !== null) {
            this.fromGlobs.add(fromGlob);
        } // otherwise if fromGlob is null, meaning is the root
    }
    /**
     * clear all children and "fromGlobs" set, keeps uri, name and isLeaf
     */
    public clear() {
        this.children?.clear();
        this.fromGlobs.clear();
    }
    /**
     * Add a file uri into the subtree starting from this node (recursive operation). the effect may be add a sub-tree under this or a children node
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
    public addFile(fileUri: Uri, fromGlob: string, relativePath: string, startPosition: number): UriNode | undefined {
        // parent is responsible for setting children's "fromSelector", and no one set root's (not required)
        // find out position of next separator and the name of next segment
        const [nextSeparator, name] = returnNextSeparatorAndName(relativePath, startPosition);
        // find out if the path has been created already
        const existingChild = this.children!.get(name);
        // otherwise create the child node
        const newChild = existingChild? undefined : this.addNewChild(fileUri, fromGlob, name, nextSeparator<0);
        const theChild = existingChild || newChild as UriNode;
        theChild.fromGlobs.add(fromGlob);
        if (nextSeparator<0) {
            return existingChild? undefined : this; // if an existing leaf node, no affection since just add a selector to an existing file, otherwise return this (where insertion starts)
        } else {
            // still needs to go down the path
            const childrenAffected = theChild.addFile(fileUri, fromGlob, relativePath, nextSeparator+1 );
            return existingChild? childrenAffected : this; // if is an existing child, return the affected children, otherwise return this (where insertion starts)
        }
    }

    private addNewChild(fileUri: Uri, fromGlob:string, name:string, isLeaf:boolean) {
        const newChild = new UriNode(
            this.uri? (isLeaf ? fileUri : Uri.joinPath(this.uri, name)) : // not workspace-folder, then either file or dir
                workspace.getWorkspaceFolder(fileUri)!.uri, // the workspace folder
            fromGlob,
            name,
            isLeaf // is leaf - if no more separator
        );
        this.children!.set(name, newChild);
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
        const downPathChild = this.children!.get(name);
        if (! downPathChild) {
            return undefined; // already deleted, no effect
        }
        if (nextSeparator < 0) {
            this.children!.delete(name); // delete the leaf
            return this; // and this node is where deletion starts
        } else { // ask the child to delete 
            const affectedChild = downPathChild.delFile(relativePath, nextSeparator + 1);
            if ( downPathChild.children!.size===0) {
                // left an empty down-path child, delete as well
                this.children!.delete(name);
                return this;
            } else {
                return affectedChild;
            }
        }
    }

    
    public delChildrenFromGlob(globIdStr: string) : UriNode | undefined  {
        let nodeAffected : UriNode | undefined = undefined;
        for (const [childKey, childNode] of (this.children?this.children.entries():([] as [string,UriNode][]))) {
            if (childNode.fromGlobs.delete(globIdStr)) { // so childNode was at least partially from selector
                // if childNode not only from this but also other selector, go down the path and find the affected node (where deletion occurs)
                // otherwise undefined
                const childNodeAffected = (childNode.fromGlobs.size>0? childNode.delChildrenFromGlob(globIdStr):undefined);
                if (childNode.fromGlobs.size===0 || (childNode.children && (  childNode.children.size === 0))) {
                    // for whatever reason the childNode now has no selector source, or is a non-leaf none-children node
                    this.children!.delete(childKey);
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
