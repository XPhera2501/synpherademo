import { useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { SecurityFinding } from '@/lib/synphera-types';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  findings?: SecurityFinding[];
}

export function PromptEditor({ value, onChange, placeholder, label = 'Prompt Content', minHeight = '200px', findings = [] }: PromptEditorProps) {
  const variables = extractVariables(value);

  // Build line-level highlights from findings
  const highlightedLines = useMemo(() => {
    const map = new Map<number, 'HIGH' | 'MEDIUM' | 'LOW'>();
    for (const f of findings) {
      if (f.line) {
        const existing = map.get(f.line);
        if (!existing || severityRank(f.severity) > severityRank(existing)) {
          map.set(f.line, f.severity);
        }
      }
    }
    return map;
  }, [findings]);

  // Render content with highlighted lines if findings exist
  const lines = value.split('\n');
  const hasHighlights = highlightedLines.size > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {variables.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Variables:</span>
            {variables.map(v => (
              <Badge key={v} variant="outline" className="text-[10px] font-mono h-5 px-1.5 bg-primary/5 border-primary/30 text-primary">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Highlighted line overlay shown below textarea when findings exist */}
      {hasHighlights && (
        <div className="rounded-lg border border-border bg-card overflow-auto max-h-40 font-mono text-xs">
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const severity = highlightedLines.get(lineNum);
            const bgClass = severity === 'HIGH'
              ? 'bg-status-red/15 border-l-2 border-l-status-red'
              : severity === 'MEDIUM'
              ? 'bg-status-amber/15 border-l-2 border-l-status-amber'
              : '';
            return (
              <div key={i} className={`flex gap-2 px-2 py-0.5 ${bgClass}`}>
                <span className="text-muted-foreground select-none w-6 text-right flex-shrink-0">{lineNum}</span>
                <span className="whitespace-pre-wrap break-all">{line || ' '}</span>
              </div>
            );
          })}
        </div>
      )}

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Enter your prompt content here. Use {{variable_name}} for dynamic placeholders..."}
        className="font-mono text-sm bg-card"
        style={{ minHeight }}
      />
      <p className="text-xs text-muted-foreground">
        ℹ️ Use {'{{variable}}'} syntax for dynamic placeholders. Avoid PII, proprietary markers, and sensitive data.
      </p>
    </div>
  );
}

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

function severityRank(s: 'HIGH' | 'MEDIUM' | 'LOW'): number {
  return s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1;
}
