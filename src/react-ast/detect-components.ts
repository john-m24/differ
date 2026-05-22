import ts from "typescript";
import type { ReactNode, ReactNodeKind } from "./types.js";

export function detectNodes(sourceFile: ts.SourceFile, filePath: string): ReactNode[] {
  const nodes: ReactNode[] = [];

  function visit(node: ts.Node) {
    // Exported function declarations: export function Foo() { ... }
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const exported = hasExportModifier(node);
      const kind = classifyFunction(name, node, filePath);
      if (kind) {
        nodes.push({
          id: `${filePath}#${name}`,
          kind,
          name,
          filePath,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          exported,
        });
      }
    }

    // Variable declarations: export const Foo = () => { ... } or const useX = () => { ... }
    if (ts.isVariableStatement(node)) {
      const exported = hasExportModifier(node);
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        const name = decl.name.text;

        // Arrow function or function expression
        if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
          const kind = classifyFunction(name, decl.initializer, filePath);
          if (kind) {
            nodes.push({
              id: `${filePath}#${name}`,
              kind,
              name,
              filePath,
              line: sourceFile.getLineAndCharacterOfPosition(decl.getStart()).line + 1,
              exported,
            });
          }
        }

        // Store detection: const useStore = create<T>(...)
        if (ts.isCallExpression(decl.initializer)) {
          const storeInfo = detectStoreCreation(decl.initializer, name);
          if (storeInfo) {
            nodes.push({
              id: `${filePath}#${name}`,
              kind: "store",
              name,
              filePath,
              line: sourceFile.getLineAndCharacterOfPosition(decl.getStart()).line + 1,
              exported,
              storeKeys: storeInfo.keys,
            });
          }

          // Context detection: const MyContext = createContext(...)
          if (isCreateContextCall(decl.initializer)) {
            nodes.push({
              id: `${filePath}#${name}`,
              kind: "context",
              name,
              filePath,
              line: sourceFile.getLineAndCharacterOfPosition(decl.getStart()).line + 1,
              exported,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return nodes;
}

function classifyFunction(
  name: string,
  node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  filePath: string
): ReactNodeKind | null {
  // Hooks: functions starting with "use" followed by uppercase
  if (/^use[A-Z]/.test(name)) {
    return "hook";
  }

  // Components: PascalCase functions that contain JSX
  if (/^[A-Z]/.test(name) && containsJsx(node)) {
    return "component";
  }

  return null;
}

function containsJsx(node: ts.Node): boolean {
  let found = false;
  function walk(n: ts.Node) {
    if (found) return;
    if (
      ts.isJsxElement(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isJsxFragment(n)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(n, walk);
  }
  walk(node);
  return found;
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function detectStoreCreation(
  call: ts.CallExpression,
  varName: string
): { keys: string[] } | null {
  const callee = call.expression;
  let funcName = "";

  if (ts.isIdentifier(callee)) {
    funcName = callee.text;
  } else if (ts.isPropertyAccessExpression(callee)) {
    funcName = callee.name.text;
  }

  // zustand: create(), redux toolkit: createSlice(), createStore()
  if (!["create", "createSlice", "createStore"].includes(funcName)) {
    return null;
  }

  // Extract state keys from the initializer argument
  const keys = extractStateKeys(call);
  return { keys };
}

function extractStateKeys(call: ts.CallExpression): string[] {
  const keys: string[] = [];

  for (const arg of call.arguments) {
    // zustand: create((set, get) => ({ key1: ..., key2: ... }))
    if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
      const body = arg.body;
      if (ts.isParenthesizedExpression(body) && ts.isObjectLiteralExpression(body.expression)) {
        extractKeysFromObject(body.expression, keys);
      } else if (ts.isBlock(body)) {
        // Look for return statement with object literal
        body.statements.forEach(stmt => {
          if (ts.isReturnStatement(stmt) && stmt.expression && ts.isObjectLiteralExpression(stmt.expression)) {
            extractKeysFromObject(stmt.expression, keys);
          }
        });
      }
    }

    // Direct object literal: createSlice({ name, initialState: { key1, key2 } })
    if (ts.isObjectLiteralExpression(arg)) {
      const initialState = arg.properties.find(
        p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "initialState"
      );
      if (initialState && ts.isPropertyAssignment(initialState) && ts.isObjectLiteralExpression(initialState.initializer)) {
        extractKeysFromObject(initialState.initializer, keys);
      }
    }
  }

  return keys;
}

function extractKeysFromObject(obj: ts.ObjectLiteralExpression, keys: string[]) {
  for (const prop of obj.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
      // Skip setter functions (set*, toggle*, etc.)
      const name = prop.name.text;
      if (!/^(set|toggle|reset|update|clear|add|remove)/.test(name)) {
        keys.push(name);
      }
    }
    if (ts.isShorthandPropertyAssignment(prop)) {
      keys.push(prop.name.text);
    }
    if (ts.isMethodDeclaration(prop) && ts.isIdentifier(prop.name)) {
      // Skip methods — they're actions, not state
    }
  }
}

function isCreateContextCall(call: ts.CallExpression): boolean {
  const callee = call.expression;
  if (ts.isIdentifier(callee) && callee.text === "createContext") return true;
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === "createContext") return true;
  return false;
}
