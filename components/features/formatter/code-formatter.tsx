'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Copy, Check, Settings, X } from 'lucide-react';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
];

export default function CodeFormatter() {
  const [code, setCode] = useState('');
  const [formatted, setFormatted] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Format options
  const [language, setLanguage] = useState('javascript');
  const [dialect, setDialect] = useState('');
  const [mode, setMode] = useState<
    | 'pretty'
    | 'minify'
    | 'standardize'
    | 'sort-imports'
    | 'sql-uppercase-keywords'
  >('pretty');
  const [indent, setIndent] = useState(2);
  const [tabsToSpaces, setTabsToSpaces] = useState(true);
  const [lineLength, setLineLength] = useState(80);
  const [quotes, setQuotes] = useState<
    'single' | 'double' | 'prefer-single' | 'prefer-double'
  >('double');
  const [braceStyle, setBraceStyle] = useState<'1tbs' | 'allman'>('1tbs');
  const [semicolons, setSemicolons] = useState(true);
  const [sortImports, setSortImports] = useState(false);
  const [trimTrailingWhitespace, setTrimTrailingWhitespace] = useState(true);
  const [eofNewline, setEofNewline] = useState(true);
  const [preserveComments, setPreserveComments] = useState(true);
  const [sqlCase, setSqlCase] = useState<'upper' | 'lower' | 'preserve'>(
    'upper'
  );

  // Auto-set SQL defaults when language changes to SQL
  useEffect(() => {
    if (language === 'sql') {
      setIndent(4);
      setLineLength(300);
    }
  }, [language]);

  const handleFormat = async () => {
    if (!code.trim()) {
      setError('Vui lòng nhập code để format');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/formatter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          dialect: dialect || undefined,
          mode,
          indent,
          tabs_to_spaces: tabsToSpaces,
          line_length: lineLength,
          quotes,
          brace_style: braceStyle,
          semicolons,
          sort_imports: sortImports,
          trim_trailing_whitespace: trimTrailingWhitespace,
          eof_newline: eofNewline,
          preserve_comments: preserveComments,
          sql_case: language === 'sql' ? sqlCase : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFormatted(data.formatted);
      } else {
        setError(data.error || 'Lỗi khi format code');
        setFormatted(data.formatted || code);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi request');
      setFormatted(code);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleApplySettings = async () => {
    await handleFormat();
    setSettingsOpen(false);
  };

  const handleReset = () => {
    setCode('');
    setFormatted('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Code Formatter</h2>
          <p className="text-muted-foreground">
            Format và làm đẹp code của bạn với nhiều tùy chọn tùy chỉnh
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Format Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Format Settings</DialogTitle>
                <DialogDescription>
                  Cấu hình các tùy chọn format cho code của bạn
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Ngôn ngữ</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Chế độ</Label>
                  <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pretty">Pretty</SelectItem>
                      <SelectItem value="minify">Minify</SelectItem>
                      <SelectItem value="standardize">Standardize</SelectItem>
                      <SelectItem value="sort-imports">Sort Imports</SelectItem>
                      {language === 'sql' && (
                        <SelectItem value="sql-uppercase-keywords">
                          SQL Uppercase Keywords
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Indent (spaces)</Label>
                  <Input
                    type="number"
                    value={indent}
                    onChange={(e) => setIndent(parseInt(e.target.value) || 2)}
                    min={0}
                    max={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Line Length</Label>
                  <Input
                    type="number"
                    value={lineLength}
                    onChange={(e) =>
                      setLineLength(parseInt(e.target.value) || 80)
                    }
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quote Style</Label>
                  <Select
                    value={quotes}
                    onValueChange={(v: any) => setQuotes(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="double">Double</SelectItem>
                      <SelectItem value="prefer-single">
                        Prefer Single
                      </SelectItem>
                      <SelectItem value="prefer-double">
                        Prefer Double
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {language === 'sql' && (
                  <div className="space-y-2">
                    <Label>SQL Keyword Case</Label>
                    <Select
                      value={sqlCase}
                      onValueChange={(v: any) => setSqlCase(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upper">Upper</SelectItem>
                        <SelectItem value="lower">Lower</SelectItem>
                        <SelectItem value="preserve">Preserve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="tabs-to-spaces"
                    checked={tabsToSpaces}
                    onCheckedChange={setTabsToSpaces}
                  />
                  <Label htmlFor="tabs-to-spaces">Tabs to Spaces</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="semicolons"
                    checked={semicolons}
                    onCheckedChange={setSemicolons}
                  />
                  <Label htmlFor="semicolons">Semicolons</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="sort-imports"
                    checked={sortImports}
                    onCheckedChange={setSortImports}
                  />
                  <Label htmlFor="sort-imports">Sort Imports</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="trim-trailing"
                    checked={trimTrailingWhitespace}
                    onCheckedChange={setTrimTrailingWhitespace}
                  />
                  <Label htmlFor="trim-trailing">
                    Trim Trailing Whitespace
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="eof-newline"
                    checked={eofNewline}
                    onCheckedChange={setEofNewline}
                  />
                  <Label htmlFor="eof-newline">Newline at EOF</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="preserve-comments"
                    checked={preserveComments}
                    onCheckedChange={setPreserveComments}
                  />
                  <Label htmlFor="preserve-comments">Preserve Comments</Label>
                </div>
              </div>
              <DialogFooter className="flex justify-end">
                <Button
                  onClick={handleApplySettings}
                  disabled={loading || !code.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang format...
                    </>
                  ) : (
                    'Áp dụng'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-stretch">
        {/* Left: Input */}
        <Card className="flex flex-col">
          <CardHeader className='min-h-10'>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-sm flex-1 min-h-[300px] max-h-[500px] overflow-auto"
            />
          </CardContent>
        </Card>

        {/* Right: Output */}
        <Card className="flex flex-col">
          <CardHeader className='min-h-10'>
            <div className="flex justify-between items-center">
              <CardTitle>Output</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormatted('')}
                  disabled={!formatted}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(formatted)}
                  disabled={!formatted}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Textarea
              value={formatted}
              readOnly
              className="font-mono text-sm flex-1 min-h-[300px] max-h-[500px] overflow-auto bg-muted"
            />
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
