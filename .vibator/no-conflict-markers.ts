/** The `no-conflict-markers` rule: no file keeps a marker from an unfinished merge. */
import { defineRule, vibator } from 'vibator';

/** The markers git writes, at the start of a line. */
const CONFLICT_MARKER = /^(?:<<<<<<< |\|\|\|\|\|\|\| |={7}$|>>>>>>> )/;

export default defineRule({
  id: 'no-conflict-markers',
  title: 'No unresolved merge conflict markers',
  check: () =>
    vibator.project.files
      .match(['**/*'])
      .filter((file) => !vibator.text.binary(file))
      .flatMap((file) =>
        vibator.text
          .lines(file)
          .filter((line) => CONFLICT_MARKER.test(line.text))
          .slice(0, 1)
          .map((line) => ({
            file: file.path,
            line: line.number,
            message: `Unresolved merge conflict marker: ${line.text.slice(0, 24)}`,
            expected: 'No conflict markers in committed files.',
            fix: 'Finish the merge and delete the <<<<<<<, =======, and >>>>>>> lines.',
          })),
      ),
});
