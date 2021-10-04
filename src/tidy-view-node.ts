import { Uri, workspace } from "vscode";
import { Selector } from "./selector";
import { returnNextSeparatorAndName } from "./tidy-view";

export class UriNode {
    readonly children: Object & { [key: string]: UriNode; } | undefined;
    private readonly fromSelectors: Set<Selector> = new Set<Selector>();
    public static createRoot() : UriNode {
        return new UriNode(null,null,"ROOT",false);
    }
    private constructor(readonly uri: Uri | null, fromSelector: Selector|null, readonly name: string, isLeaf: boolean) {
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
    public addChildren(fileUri: Uri, fromSelector: Selector, relativePath: string, startPosition: number): UriNode | undefined {
        this.fromSelectors.add(fromSelector);
        const [nextSeparator, name] = returnNextSeparatorAndName(relativePath, startPosition);
        if (nextSeparator < 0) {
            // no more separator, the leaf uri should be added as child
            // if everything works normal should never add child to a left - no child for a file, only child for dir
            const existingChild = this.children![name];
            if (existingChild) {
                existingChild.fromSelectors.add(fromSelector);
                return undefined; // no node is affected, only a child has a new selector
            } else {
                this.children![name] = new UriNode(fileUri, fromSelector, name, true);
                return this; // this node has a new child, affected
            }
        } else {
            // a dir, perhaps already exists
            const existChild = this.children![name];
            const newChild = (existChild ? undefined : 
                new UriNode(
                    this.uri? Uri.joinPath(this.uri, name) : workspace.getWorkspaceFolder(fileUri)!.uri, 
                    fromSelector, name, false));
            if (newChild) {
                this.children![name] = newChild;
            };
            return (existChild || newChild).addChildren(fileUri, fromSelector, relativePath, nextSeparator + 1);
        }
    }

    /**
     * Delete a leaf child, possibly also delete a parent if the parent is left empty
     * @param relativePath - the relative path of a file uri, relative to the workspace-folder
     * @param startPosition - the start position, must be the last PATH_SEPARATOR + 1
     * @returns the immediate parent node of the finally deleted UriNode
     */
    public delChildren(relativePath: string, startPosition: number): UriNode | undefined {
        const [nextSeparator, name] = returnNextSeparatorAndName(relativePath, startPosition);
        // check in case already deleted
        if (! this.children![name]) {
            return undefined; // already deleted, no effect
        }
        if (nextSeparator < 0) {
            delete this.children![name]; // delete the leaf
            return this;
        } else { // ask the child to delete 
            const affectedChild = this.children![name];
            const toReturn = affectedChild.delChildren(relativePath, nextSeparator + 1);
            if (Object.keys(affectedChild.children!).length == 0) {
                // left an empty children, delete as well
                delete this.children![name];
                return this;
            } else {
                return toReturn;
            }
        }
    }

    
    public delChildrenFromSelector(selector: Selector) : UriNode | undefined {
        if (this.fromSelectors.has(selector)) {
            this.fromSelectors.delete(selector);
            if (this.fromSelectors.size===0) {
                // everything should be deleted from here, "this" is affected
                return this;
            }
            let affectedNode = undefined;
            for (const [childKey, childNode] of Object.entries(this.children || [])) {
                const affectedNodeInChild = childNode.delChildrenFromSelector(selector);
                if (childNode.fromSelectors.size===0) {
                    // child should be detached
                    delete this.children![childKey];
                    affectedNode = this;                    
                };
                // if two children are affected, this would be the return node, otherwise the one affected
                affectedNode = affectedNode? (affectedNodeInChild? this:affectedNode):affectedNodeInChild;
            }
            return affectedNode;
        } else {
            // nothing to do
            return undefined
        }
    }
}
