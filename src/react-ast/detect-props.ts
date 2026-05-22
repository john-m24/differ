import ts from "typescript";
import type { PropSignature } from "./types.js";

export function detectProps(
  sourceFile: ts.SourceFile,
  filePath: string,
  componentName: string
): PropSignature[] {
  const props: PropSignature[] = [];

  function visit(node: ts.Node) {
    // Match function declaration: function ComponentName({ ... }: Type)
    if (ts.isFunctionDeclaration(node) && node.name?.text === componentName) {
      extractFromParams(node.parameters, props, sourceFile);
      return;
    }

    // Match variable declaration: const ComponentName = ({ ... }: Type) => ...
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === componentName && decl.initializer) {
          if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
            extractFromParams(decl.initializer.parameters, props, sourceFile);
            return;
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return props;
}

function extractFromParams(
  params: ts.NodeArray<ts.ParameterDeclaration>,
  props: PropSignature[],
  sourceFile: ts.SourceFile
) {
  if (params.length === 0) return;

  const firstParam = params[0];

  // Destructured: ({ foo, bar }: Props)
  if (ts.isObjectBindingPattern(firstParam.name)) {
    // Try to get type from annotation
    if (firstParam.type) {
      extractFromTypeNode(firstParam.type, props, sourceFile);
    } else {
      // No type annotation — extract names from destructuring
      for (const element of firstParam.name.elements) {
        if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
          props.push({
            name: element.name.text,
            type: "unknown",
            optional: !!element.initializer,
          });
        }
      }
    }
  }

  // Non-destructured: (props: Props)
  if (ts.isIdentifier(firstParam.name) && firstParam.type) {
    extractFromTypeNode(firstParam.type, props, sourceFile);
  }
}

function extractFromTypeNode(
  typeNode: ts.TypeNode,
  props: PropSignature[],
  sourceFile: ts.SourceFile
) {
  // Inline object type: { foo: string; bar?: number }
  if (ts.isTypeLiteralNode(typeNode)) {
    for (const member of typeNode.members) {
      if (ts.isPropertySignature(member) && member.name) {
        const name = ts.isIdentifier(member.name) ? member.name.text : member.name.getText(sourceFile);
        const type = member.type ? member.type.getText(sourceFile) : "unknown";
        props.push({ name, type, optional: !!member.questionToken });
      }
    }
    return;
  }

  // Type reference: Props or React.FC<Props>
  if (ts.isTypeReferenceNode(typeNode)) {
    // Look up the type definition in the same file
    const typeName = typeNode.typeName.getText(sourceFile);
    const resolved = findTypeInFile(sourceFile, typeName);
    if (resolved) {
      for (const member of resolved.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const name = ts.isIdentifier(member.name) ? member.name.text : member.name.getText(sourceFile);
          const type = member.type ? member.type.getText(sourceFile) : "unknown";
          props.push({ name, type, optional: !!member.questionToken });
        }
      }
    }
    return;
  }

  // Intersection type: Props & OtherProps
  if (ts.isIntersectionTypeNode(typeNode)) {
    for (const subType of typeNode.types) {
      extractFromTypeNode(subType, props, sourceFile);
    }
  }
}

function findTypeInFile(
  sourceFile: ts.SourceFile,
  typeName: string
): ts.InterfaceDeclaration | ts.TypeLiteralNode | null {
  for (const stmt of sourceFile.statements) {
    // interface Props { ... }
    if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === typeName) {
      return stmt;
    }
    // type Props = { ... }
    if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === typeName) {
      if (ts.isTypeLiteralNode(stmt.type)) {
        return stmt.type;
      }
    }
  }
  return null;
}
