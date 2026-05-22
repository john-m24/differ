import ts from "typescript";
import type { FileParseResult } from "./types.js";

export function detectEdges(
  sourceFile: ts.SourceFile,
  filePath: string,
  nodeIds: Set<string>
): Pick<FileParseResult, "jsxReferences" | "hookCalls" | "contextProviders" | "contextConsumers" | "imports"> {
  const jsxReferences: FileParseResult["jsxReferences"] = [];
  const hookCalls: FileParseResult["hookCalls"] = [];
  const contextProviders: FileParseResult["contextProviders"] = [];
  const contextConsumers: FileParseResult["contextConsumers"] = [];
  const imports: FileParseResult["imports"] = [];

  // Collect imports first
  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const source = stmt.moduleSpecifier.text;
      const clause = stmt.importClause;
      if (!clause) continue;

      if (clause.name) {
        imports.push({ localName: clause.name.text, source, importedName: "default" });
      }

      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const spec of clause.namedBindings.elements) {
          const importedName = spec.propertyName?.text ?? spec.name.text;
          imports.push({ localName: spec.name.text, source, importedName });
        }
      }
    }
  }

  // For each node in this file, walk its function body
  for (const stmt of sourceFile.statements) {
    // Function declarations: export function Foo() { ... }
    if (ts.isFunctionDeclaration(stmt) && stmt.name && stmt.body) {
      const id = `${filePath}#${stmt.name.text}`;
      if (nodeIds.has(id)) {
        walkFunctionBody(stmt.body, id);
      }
    }

    // Variable declarations: const Foo = () => { ... }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
        const id = `${filePath}#${decl.name.text}`;
        if (!nodeIds.has(id)) continue;

        if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
          walkFunctionBody(decl.initializer.body, id);
        }
      }
    }
  }

  function walkFunctionBody(body: ts.Node, componentId: string) {
    function visit(node: ts.Node) {
      // JSX component references: <ComponentName ... />
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = getJsxTagName(node.tagName);
        if (tagName && /^[A-Z]/.test(tagName)) {
          jsxReferences.push({ componentId, referencedName: tagName });
        }
        if (tagName && tagName.endsWith(".Provider")) {
          const contextName = tagName.replace(".Provider", "");
          contextProviders.push({ componentId, contextName });
        }
      }

      // Hook calls: useXxx(...)
      if (ts.isCallExpression(node)) {
        // Detect useContext(X) / React.useContext(X)
        if (isUseContextCall(node) && node.arguments.length > 0 && ts.isIdentifier(node.arguments[0])) {
          contextConsumers.push({ componentId, contextName: node.arguments[0].text });
        }

        const hookInfo = detectHookCall(node);
        if (hookInfo) {
          hookCalls.push({
            componentId,
            hookName: hookInfo.name,
            subscribedKeys: hookInfo.subscribedKeys,
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    ts.forEachChild(body, visit);
  }

  return { jsxReferences, hookCalls, contextProviders, contextConsumers, imports };
}

function getJsxTagName(tagName: ts.JsxTagNameExpression): string | null {
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) {
    const obj = ts.isIdentifier(tagName.expression) ? tagName.expression.text : null;
    if (obj) return `${obj}.${tagName.name.text}`;
  }
  return null;
}

function detectHookCall(node: ts.CallExpression): { name: string; subscribedKeys?: string[] } | null {
  let hookName: string | null = null;

  if (ts.isIdentifier(node.expression)) {
    const name = node.expression.text;
    if (/^use[A-Z]/.test(name)) hookName = name;
  } else if (ts.isPropertyAccessExpression(node.expression)) {
    const name = node.expression.name.text;
    if (/^use[A-Z]/.test(name)) hookName = name;
  }

  if (!hookName) return null;

  const subscribedKeys = extractSubscribedKeys(node);
  return { name: hookName, subscribedKeys: subscribedKeys.length > 0 ? subscribedKeys : undefined };
}

function extractSubscribedKeys(call: ts.CallExpression): string[] {
  const keys: string[] = [];

  if (call.arguments.length > 0) {
    const arg = call.arguments[0];
    if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
      collectPropertyAccesses(arg.body, keys);
    }
  }

  return keys;
}

function collectPropertyAccesses(node: ts.Node, keys: string[]) {
  if (ts.isPropertyAccessExpression(node)) {
    keys.push(node.name.text);
    return;
  }
  ts.forEachChild(node, child => collectPropertyAccesses(child, keys));
}

function isUseContextCall(node: ts.CallExpression): boolean {
  if (ts.isIdentifier(node.expression) && node.expression.text === "useContext") {
    return true;
  }
  if (ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "useContext" &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "React") {
    return true;
  }
  return false;
}
