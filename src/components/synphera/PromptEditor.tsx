import { useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: string;
}

export function PromptEditor({ value, onChange, placeholder, label = 'Prompt Content', minHeight = '200px' }: PromptEditorProps) {
  // Extract variables from content
  const variables = extractVariables(value);

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
