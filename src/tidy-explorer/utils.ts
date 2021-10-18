const PATH_SEPARATOR = "/";

export function returnNextSeparatorAndName(relativePath: string, startPosition: number): [number, string] {
    // find next section 
    const nextSeparator = relativePath.indexOf(PATH_SEPARATOR, startPosition);
    // the child node's name, either a file or dir name
    const name = relativePath.substr(startPosition, (nextSeparator > 0 ? nextSeparator : relativePath.length) - startPosition);
    return [nextSeparator, name];
}
