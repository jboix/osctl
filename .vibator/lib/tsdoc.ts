/** The TSDoc checks over the functions and class members of a file. */
import ts from 'typescript';
import { type File, vibator } from 'vibator';

/** One undocumented or under-documented declaration. */
export interface TsdocViolation {
  /** The 1-based line of the declaration. */
  readonly line: number;
  /** The declaration name, class-qualified for a member. */
  readonly symbol: string;
  /** What the documentation lacks. */
  readonly problem: string;
}

/** A function-like node that may carry parameters and a body. */
type FunctionLike = ts.SignatureDeclaration & { readonly body?: ts.Node };

/** A node with the TSDoc blocks the parser attached to it. */
type Documented = ts.Node & { readonly jsDoc?: readonly ts.JSDoc[] };

/**
 * The TSDoc blocks attached to a node.
 *
 * @param node - The declaration to read.
 * @returns The blocks, empty when none are attached.
 */
function jsDocsOf(node: ts.Node): readonly ts.JSDoc[] {
  return (node as Documented).jsDoc ?? [];
}

/**
 * Whether a function body holds a `return` with a value, outside nested functions.
 *
 * @param body - The body to walk.
 * @returns True when a `return` with a value is reached.
 */
function hasValueReturn(body: ts.Node): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found || ts.isFunctionLike(node)) return;
    found = ts.isReturnStatement(node) && node.expression !== undefined;
    if (!found) ts.forEachChild(node, visit);
  };
  ts.forEachChild(body, visit);
  return found;
}

/**
 * Whether a function-like returns a value. A type annotation decides: `void`,
 * `never`, `Promise<void>`, assertions, and type predicates owe no `@returns`.
 *
 * @param functionLike - The function-like to inspect.
 * @returns True when `@returns` is due.
 */
function returnsValue(functionLike: FunctionLike): boolean {
  const annotation = functionLike.type;
  if (annotation) {
    if (ts.isTypePredicateNode(annotation)) return false;
    return !/^(void|never|Promise<void>|asserts\b.*)$/.test(
      annotation.getText(),
    );
  }
  const body = functionLike.body;
  if (!body) return false;
  return ts.isBlock(body) ? hasValueReturn(body) : true;
}

/**
 * The problems with the `@param` tags of a function-like. A named parameter
 * claims the tag of its name; a destructured one claims the next unclaimed tag.
 *
 * @param functionLike - The function-like whose parameters are checked.
 * @param docs - Its TSDoc blocks.
 * @returns One problem per undocumented parameter.
 */
function paramProblems(
  functionLike: FunctionLike,
  docs: readonly ts.JSDoc[],
): string[] {
  const tags = docs
    .flatMap((doc) => doc.tags ?? [])
    .filter(ts.isJSDocParameterTag)
    .map((tag) => tag.name.getText());
  const claimed = new Set<number>();
  return functionLike.parameters.flatMap((param) => {
    const named = ts.isIdentifier(param.name) ? param.name.text : undefined;
    const index = tags.findIndex(
      (tag, position) =>
        !claimed.has(position) && (named === undefined || tag === named),
    );
    if (index !== -1) {
      claimed.add(index);
      return [];
    }
    return [
      named === undefined
        ? 'missing @param for the destructured parameter'
        : `missing @param for "${named}"`,
    ];
  });
}

/**
 * The problem with the `@returns` tag of a function-like, if any.
 *
 * @param functionLike - The function-like being checked.
 * @param docs - Its TSDoc blocks.
 * @returns `missing @returns`, or nothing.
 */
function returnsProblems(
  functionLike: FunctionLike,
  docs: readonly ts.JSDoc[],
): string[] {
  const tagged = docs
    .flatMap((doc) => doc.tags ?? [])
    .some((tag) => ['returns', 'return'].includes(tag.tagName.text));
  return returnsValue(functionLike) && !tagged ? ['missing @returns'] : [];
}

/**
 * Checks one function-like declaration.
 *
 * @param source - The file being checked.
 * @param functionLike - The function-like node.
 * @param holder - The node the TSDoc attaches to: the statement for `const fn = ...`.
 * @param symbol - The name used in reports.
 * @returns The violations found.
 */
function checkFunction(
  source: ts.SourceFile,
  functionLike: FunctionLike,
  holder: ts.Node,
  symbol: string,
): TsdocViolation[] {
  const line = source.getLineAndCharacterOfPosition(holder.getStart()).line;
  const docs = jsDocsOf(holder);
  const problems =
    docs.length === 0
      ? ['needs a TSDoc block']
      : [
          ...paramProblems(functionLike, docs),
          ...returnsProblems(functionLike, docs),
        ];
  return problems.map((problem) => ({ line: line + 1, symbol, problem }));
}

/**
 * Checks the function-valued bindings of a statement such as `const fn = () => {}`.
 *
 * @param source - The file being checked.
 * @param statement - The variable statement.
 * @returns The violations found.
 */
function checkVariables(
  source: ts.SourceFile,
  statement: ts.VariableStatement,
): TsdocViolation[] {
  return statement.declarationList.declarations.flatMap((declaration) => {
    const value = declaration.initializer;
    if (!value || !ts.isIdentifier(declaration.name)) return [];
    if (!ts.isArrowFunction(value) && !ts.isFunctionExpression(value)) {
      return [];
    }
    return checkFunction(source, value, statement, declaration.name.text);
  });
}

/**
 * Checks the methods, constructor, and accessors of a class.
 *
 * @param source - The file being checked.
 * @param declaration - The class.
 * @returns The violations found, each under its class-qualified name.
 */
function checkClass(
  source: ts.SourceFile,
  declaration: ts.ClassDeclaration,
): TsdocViolation[] {
  const className = declaration.name?.text ?? '(anonymous class)';
  return declaration.members.flatMap((member) => {
    if (!ts.isFunctionLike(member)) return [];
    const name = ts.isConstructorDeclaration(member)
      ? 'constructor'
      : (member.name?.getText(source) ?? '(computed)');
    return checkFunction(source, member, member, `${className}.${name}`);
  });
}

/**
 * Checks the top-level functions, function-valued constants, and classes of a file.
 *
 * @param file - The TypeScript file.
 * @returns The violations found, in source order.
 */
export function tsdocViolations(file: File): TsdocViolation[] {
  const source = vibator.ts.parse(file).source;
  return source.statements.flatMap((statement) => {
    if (ts.isFunctionDeclaration(statement)) {
      const name = statement.name?.text ?? 'default';
      return checkFunction(source, statement, statement, name);
    }
    if (ts.isVariableStatement(statement)) {
      return checkVariables(source, statement);
    }
    if (ts.isClassDeclaration(statement)) return checkClass(source, statement);
    return [];
  });
}
