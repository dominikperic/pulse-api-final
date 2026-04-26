function toPascalCase(input) {
  return String(input || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('');
}

function normalizeSchemaType(schema) {
  const t = schema?.type;
  if (!t) return { base: null, nullable: false };
  if (Array.isArray(t)) {
    const nullable = t.includes('null');
    const base = t.find((x) => x !== 'null') || 'any';
    return { base, nullable };
  }
  return { base: t, nullable: false };
}

function zodLiteral(v) {
  if (typeof v === 'string') return `'${v.replace(/'/g, "\\'")}'`;
  return JSON.stringify(v);
}

function zodFromSchema(schema, nameHint, declarations) {
  if (!schema || typeof schema !== 'object') return 'z.any()';
  const { base, nullable } = normalizeSchemaType(schema);
  let out = 'z.any()';
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    if (schema.enum.every((v) => typeof v === 'string')) out = `z.enum([${schema.enum.map(zodLiteral).join(', ')}])`;
    else out = `z.union([${schema.enum.map((v) => `z.literal(${zodLiteral(v)})`).join(', ')}])`;
  } else if (base === 'string') out = 'z.string()';
  else if (base === 'integer' || base === 'number') out = 'z.number()';
  else if (base === 'boolean') out = 'z.boolean()';
  else if (base === 'array') out = `z.array(${zodFromSchema(schema.items || {}, `${nameHint}Item`, declarations)})`;
  else if (base === 'object' || schema.properties) {
    const schemaName = `${toPascalCase(nameHint)}Schema`;
    const props = schema.properties || {};
    const required = new Set(schema.required || []);
    const lines = Object.entries(props).map(([k, v]) => {
      const child = zodFromSchema(v, `${nameHint}${toPascalCase(k)}`, declarations);
      const shaped = required.has(k) ? child : `${child}.optional()`;
      return `  ${JSON.stringify(k)}: ${shaped},`;
    });
    declarations.push(`export const ${schemaName} = z.object({\n${lines.join('\n')}\n});`);
    out = schemaName;
  }
  if (nullable) out = `${out}.nullable()`;
  return out;
}

export function generateZodModels(contract) {
  const baseName = toPascalCase(contract?.name || `${contract?.method || 'Api'}${contract?.path || 'Endpoint'}`) || 'ApiOperation';
  const declarations = [];
  const requestName = `${baseName}Request`;
  const requestExpr = zodFromSchema(contract?.requestSchema || {}, requestName, declarations);
  const responseCodes = Object.keys(contract?.responseSchemas || {}).sort();
  const responseDecls = responseCodes.map((code) => {
    const expr = zodFromSchema(contract.responseSchemas[code], `${baseName}Response${code}`, declarations);
    return `export const ${baseName}Response${code}Schema = ${expr};`;
  });
  const primaryName = responseCodes[0] ? `${baseName}Response${responseCodes[0]}Schema` : null;

  const content = [
    "import { z } from 'zod';",
    '',
    `export const ${requestName}Schema = ${requestExpr};`,
    ...responseDecls,
    ...declarations.filter((v, i, arr) => arr.indexOf(v) === i),
  ].join('\n');

  return {
    baseName,
    requestSchemaName: `${requestName}Schema`,
    primaryResponseSchemaName: primaryName,
    content,
  };
}
