// A shown document: the fold context over the toolkit's document block.

import { DocBlock as DocBlockView } from 'inkstand';
import { createContext, type ReactElement, useContext } from 'react';

/** Whether every document block renders expanded. Toggled by ctrl+o. */
export const DocFoldContext = createContext(false);

/**
 * Renders a document block against the shared fold flag.
 *
 * @param props - The component props.
 * @param props.title - The block title, like `template "logs"`.
 * @param props.text - The document body, pretty printed.
 * @returns The document block element.
 */
export function DocBlock(props: { title: string; text: string }): ReactElement {
  const expanded = useContext(DocFoldContext);
  return (
    <DocBlockView
      expanded={expanded}
      hint={expanded ? 'ctrl+o folds' : 'ctrl+o expands'}
      text={props.text}
      title={props.title}
    />
  );
}
