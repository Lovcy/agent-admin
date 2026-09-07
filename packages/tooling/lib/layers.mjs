import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { parse } from '@vue/compiler-sfc';

async function files(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? files(join(root, entry.name)) : [join(root, entry.name)],
    ),
  );
  return nested.flat().filter((name) => /\.(ts|vue)$/.test(name) && !name.endsWith('.test.ts'));
}
export async function checkLayers(root) {
  const failures = [];
  for (const file of await files(join(root, 'src'))) {
    const name = relative(root, file).replaceAll('\\', '/');
    const text = await readFile(file, 'utf8');
    const script = file.endsWith('.vue')
      ? (() => {
          const { descriptor } = parse(text);
          return `${descriptor.script?.content ?? ''}\n${descriptor.scriptSetup?.content ?? ''}`;
        })()
      : text;
    const source = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true);
    const imports = [];
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        imports.push(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        imports.push(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(source);
    for (const specifier of imports) {
      const target = specifier.startsWith('.')
        ? relative(root, resolve(file, '..', specifier)).replaceAll('\\', '/')
        : specifier;
      if (name.includes('/domain/') && !target.includes('/domain/'))
        failures.push(`${name}: domain dependency ${specifier}`);
      if (
        (name.includes('/ui/') ||
          name.startsWith('src/pages/') ||
          name.includes('/application/')) &&
        /src\/(api|modules\/[^/]+\/data)\//.test(target)
      )
        failures.push(`${name}: bypasses application/data boundary: ${specifier}`);
      if (name.includes('/ui/') && /\/(application|data)\//.test(target))
        failures.push(`${name}: UI must receive props and emit events`);
      if (name.includes('/data/') && /\/(ui|application)\//.test(target))
        failures.push(`${name}: data cannot import UI/application`);
    }
    if (
      !name.startsWith('src/api/transport/') &&
      /\b(fetch\s*\(|XMLHttpRequest\b|axios\b)/.test(text)
    )
      failures.push(`${name}: direct transport access`);
    if (name.includes('/domain/') && /\b(window|document|localStorage|sessionStorage)\b/.test(text))
      failures.push(`${name}: browser dependency in domain`);
  }
  if (failures.length) throw new Error(failures.join('\n'));
  return 'Layer boundaries passed';
}
