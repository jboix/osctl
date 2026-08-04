// A multi-select list: space toggles, `a` toggles all, enter confirms.

import { Box, type Key, Text, useInput } from 'ink';
import type { ReactElement } from 'react';
import { useState } from 'react';

/** One selectable item. */
interface MultiSelectItem {
  /** The displayed label. */
  label: string;
  /** The unique value reported on submit. */
  value: string;
}

/** The multi-select contract. */
export interface MultiSelectProps {
  /** The selectable items, in display order. */
  items: MultiSelectItem[];
  /** Called with the selected values, in item order. */
  onSubmit: (values: string[]) => void;
}

/**
 * Renders the list with nothing preselected, because submitting a selection
 * can be destructive.
 *
 * @param props - The component props.
 * @returns The list element.
 */
export function MultiSelect(props: MultiSelectProps): ReactElement {
  const [highlight, setHighlight] = useState(0);
  const [selected, setSelected] = useState(() => new Set<string>());
  useInput((input, key) => {
    const moved = moveHighlight(key, highlight, props.items.length);
    if (moved !== undefined) {
      setHighlight(moved);
      return;
    }
    handleAction(input, key, props, { highlight, selected, setSelected });
  });
  return (
    <Box flexDirection="column">
      {props.items.map((item, index) => (
        <Row
          highlighted={index === highlight}
          item={item}
          key={item.value}
          selected={selected.has(item.value)}
        />
      ))}
      <Text dimColor>space toggles, a toggles all, enter confirms</Text>
    </Box>
  );
}

/** The selection state the actions drive. */
interface ActionState {
  /** The highlighted row. */
  highlight: number;
  /** The selected values. */
  selected: Set<string>;
  /** Replaces the selected values. */
  setSelected: (selected: Set<string>) => void;
}

/**
 * Applies a toggle or the submit.
 *
 * @param input - The printable characters of the keystroke.
 * @param key - The special-key flags.
 * @param props - The component props.
 * @param state - The selection state.
 * @returns Nothing.
 */
function handleAction(
  input: string,
  key: Key,
  props: MultiSelectProps,
  state: ActionState,
): void {
  if (input === ' ') {
    const value = props.items[state.highlight]?.value;
    if (value !== undefined) {
      state.setSelected(toggle(state.selected, value));
    }
    return;
  }
  if (input === 'a') {
    const all = props.items.map((item) => item.value);
    state.setSelected(
      state.selected.size === all.length ? new Set() : new Set(all),
    );
    return;
  }
  if (key.return) {
    const values = props.items
      .map((item) => item.value)
      .filter((value) => state.selected.has(value));
    props.onSubmit(values);
  }
}

/**
 * Toggles a value in the selection.
 *
 * @param selected - The current selection.
 * @param value - The value to toggle.
 * @returns The next selection.
 */
function toggle(selected: Set<string>, value: string): Set<string> {
  const next = new Set(selected);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

/**
 * Resolves the highlight movement of an arrow key.
 *
 * @param key - The special-key flags.
 * @param current - The current highlight index.
 * @param count - The number of items.
 * @returns The next index, or undefined when no arrow was pressed.
 */
function moveHighlight(
  key: Key,
  current: number,
  count: number,
): number | undefined {
  if (key.upArrow) {
    return (current + count - 1) % count;
  }
  if (key.downArrow) {
    return (current + 1) % count;
  }
  return undefined;
}

/**
 * Renders one row: the highlight marker, the checkbox, and the label.
 *
 * @param props - The component props.
 * @param props.item - The item to render.
 * @param props.highlighted - Whether the row is highlighted.
 * @param props.selected - Whether the row is selected.
 * @returns The row element.
 */
function Row(props: {
  item: MultiSelectItem;
  highlighted: boolean;
  selected: boolean;
}): ReactElement {
  return (
    <Text
      color={props.highlighted ? 'cyan' : undefined}
      dimColor={!(props.highlighted || props.selected)}
    >
      {props.highlighted ? '❯ ' : '  '}
      {props.selected ? '[x] ' : '[ ] '}
      {props.item.label}
    </Text>
  );
}
