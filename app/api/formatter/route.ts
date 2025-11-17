import { NextRequest, NextResponse } from 'next/server';

interface FormatRequest {
  code: string;
  language: string;
  dialect?: string;
  mode: 'pretty' | 'minify' | 'standardize' | 'sort-imports' | 'sql-uppercase-keywords';
  scope?: 'full' | 'selection';
  indent: number | string;
  tabs_to_spaces: boolean;
  line_length: number;
  quotes: 'single' | 'double' | 'prefer-single' | 'prefer-double';
  brace_style?: '1tbs' | 'allman';
  semicolons?: boolean;
  sort_imports?: boolean;
  trim_trailing_whitespace: boolean;
  eof_newline: boolean;
  preserve_comments?: boolean;
  sql_case?: 'upper' | 'lower' | 'preserve';
  extras?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FormatRequest = await request.json();
    const { code, trim_trailing_whitespace, eof_newline } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code input is required' },
        { status: 400 }
      );
    }

    try {
      let formatted = await formatCode(code, body);

      if (trim_trailing_whitespace) {
        formatted = formatted.replace(/[ \t]+$/gm, '');
      }

      if (eof_newline && !formatted.endsWith('\n')) {
        formatted += '\n';
      }

      return NextResponse.json({
        success: true,
        formatted,
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message || 'Formatting error',
        formatted: code,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Invalid request',
      },
      { status: 500 }
    );
  }
}

async function formatCode(code: string, options: FormatRequest): Promise<string> {
  const language = options.language?.toLowerCase() || 'plaintext';

  if (language === 'sql') {
    const formattedSql = await formatSQL(code, options);
    return applyModeTransforms(formattedSql, options);
  }

  const parser = getPrettierParser(language, options.dialect);
  if (parser) {
    try {
      // Dynamic import for prettier to avoid build issues
      const prettier = await import('prettier');
      const prettierOptions = buildPrettierOptions(parser, options);
      let formatted = await prettier.default.format(code, prettierOptions);
      formatted = applyModeTransforms(formatted, options);
      return formatted;
    } catch (error) {
      // Fallback to basic formatting if prettier fails
      console.error('Prettier error:', error);
      return applyModeTransforms(code, options);
    }
  }

  if (language === 'json') {
    return applyModeTransforms(formatJSONFallback(code, options), options);
  }

  return applyModeTransforms(formatGeneric(code), options);
}

function getPrettierParser(language: string, dialect?: string): string | null {
  switch (language) {
    case 'javascript':
    case 'js':
      return dialect?.toLowerCase() === 'typescript' ? 'babel-ts' : 'babel';
    case 'typescript':
    case 'ts':
      return 'babel-ts';
    case 'tsx':
      return 'babel-ts';
    case 'jsx':
      return 'babel';
    case 'json':
      return 'json';
    case 'html':
    case 'xml':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'less':
      return 'less';
    case 'markdown':
    case 'md':
      return 'markdown';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'graphql':
    case 'gql':
      return 'graphql';
    default:
      return null;
  }
}

function buildPrettierOptions(parser: string, options: FormatRequest): any {
  const indent =
    typeof options.indent === 'number'
      ? options.indent
      : options.indent === '\t'
      ? 2
      : parseInt(options.indent || '2', 10) || 2;

  const useTabs = options.tabs_to_spaces === false;
  const printWidth = options.line_length && options.line_length > 0 ? options.line_length : 1000;
  const quotePref = options.quotes || 'double';

  return {
    parser,
    tabWidth: indent,
    useTabs,
    printWidth,
    singleQuote: quotePref === 'single' || quotePref === 'prefer-single',
    semi: options.semicolons !== undefined ? options.semicolons : true,
    bracketSameLine: options.brace_style === '1tbs',
    trailingComma: 'es5',
  };
}

function applyModeTransforms(code: string, options: FormatRequest): string {
  switch (options.mode) {
    case 'minify':
      return minifyCode(code, options.language);
    case 'sort-imports':
      return sortImports(code);
    case 'sql-uppercase-keywords':
      if (options.language.toLowerCase() === 'sql') {
        return simpleSQLFormat(code, options);
      }
      return code;
    default:
      return code;
  }
}

function sortImports(code: string): string {
  const lines = code.split('\n');
  const importLines: string[] = [];
  let idx = 0;

  while (idx < lines.length) {
    const line = lines[idx];
    if (line.trim().startsWith('import ')) {
      importLines.push(line);
      idx++;
    } else {
      break;
    }
  }

  if (importLines.length <= 1) {
    return code;
  }

  const sortedImports = [...importLines].sort((a, b) => a.localeCompare(b));
  return [...sortedImports, ...lines.slice(importLines.length)].join('\n');
}

function minifyCode(code: string, language: string): string {
  if (language.toLowerCase() === 'json') {
    try {
      return JSON.stringify(JSON.parse(code));
    } catch {
      return code.replace(/\s+/g, ' ').trim();
    }
  }

  return code
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([{}()\[\];,:])\s*/g, '$1')
    .trim();
}

async function formatSQL(code: string, options: FormatRequest): Promise<string> {
  try {
    const sqlFormatter = await import('sql-formatter');
    const indentSize =
      typeof options.indent === 'number'
        ? options.indent
        : options.indent === '\t'
        ? 2
        : parseInt(options.indent || '2', 10) || 2;
    const tabWidth = Math.max(indentSize, 1);
    const useTabs = options.tabs_to_spaces === false;
    const keywordCase =
      options.sql_case === 'upper'
        ? 'upper'
        : options.sql_case === 'lower'
        ? 'lower'
        : 'preserve';

    const supportedLanguages = new Set([
      'sql',
      'bigquery',
      'db2',
      'db2i',
      'duckdb',
      'hive',
      'mariadb',
      'mysql',
      'tidb',
      'n1ql',
      'plsql',
      'postgresql',
      'redshift',
      'spark',
      'sqlite',
      'trino',
      'transactsql',
      'singlestoredb',
      'snowflake',
      'tsql',
    ]);
    const dialect = options.dialect?.toLowerCase() || 'sql';
    const formatterLanguage = supportedLanguages.has(dialect) ? dialect : 'sql';

    return sqlFormatter.format(code, {
      language: formatterLanguage as
        | 'sql'
        | 'bigquery'
        | 'db2'
        | 'db2i'
        | 'duckdb'
        | 'hive'
        | 'mariadb'
        | 'mysql'
        | 'tidb'
        | 'n1ql'
        | 'plsql'
        | 'postgresql'
        | 'redshift'
        | 'spark'
        | 'sqlite'
        | 'trino'
        | 'transactsql'
        | 'singlestoredb'
        | 'snowflake'
        | 'tsql',
      keywordCase: keywordCase as 'upper' | 'lower' | 'preserve',
      tabWidth,
      useTabs,
    });
  } catch (error) {
    console.error('SQL formatter error:', error);
    return simpleSQLFormat(code, options);
  }
}

function simpleSQLFormat(code: string, options: FormatRequest): string {
  let formatted = code;

  const keywordsUpper = [
    'SELECT',
    'FROM',
    'WHERE',
    'INSERT',
    'UPDATE',
    'DELETE',
    'CREATE',
    'ALTER',
    'DROP',
    'JOIN',
    'INNER',
    'LEFT',
    'RIGHT',
    'OUTER',
    'ON',
    'AND',
    'OR',
    'ORDER',
    'BY',
    'GROUP',
    'HAVING',
    'AS',
    'INTO',
    'VALUES',
    'SET',
    'TABLE',
    'DATABASE',
    'INDEX',
    'VIEW',
  ];

  if (options.sql_case === 'upper') {
    keywordsUpper.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, keyword);
    });
  } else if (options.sql_case === 'lower') {
    keywordsUpper.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, keyword.toLowerCase());
    });
  }

  return formatted
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),;])\s*/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatJSONFallback(code: string, options: FormatRequest): string {
  try {
    const indent = typeof options.indent === 'number' ? options.indent : 2;
    return JSON.stringify(JSON.parse(code), null, indent);
  } catch {
    return code;
  }
}

function formatGeneric(code: string): string {
  return code.trim();
}

