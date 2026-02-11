import { useState } from 'react';
import { PROMPT_TEMPLATES, PromptTemplate } from '@/lib/synphera-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookTemplate, Wand2, Code2, MessageSquare, Brain, FileJson } from 'lucide-react';

interface TemplateLibraryProps {
  onSelect: (template: PromptTemplate) => void;
}

const TYPE_CONFIG: Record<PromptTemplate['type'], { icon: React.ElementType; color: string; label: string }> = {
  'zero-shot': { icon: Wand2, label: 'Zero-Shot', color: 'bg-primary/20 text-primary' },
  'few-shot': { icon: MessageSquare, label: 'Few-Shot', color: 'bg-status-amber/20 text-status-amber' },
  'chain-of-thought': { icon: Brain, label: 'CoT', color: 'bg-purple-500/20 text-purple-400' },
  'role-play': { icon: Code2, label: 'Role-Play', color: 'bg-pink-500/20 text-pink-400' },
  'structured': { icon: FileJson, label: 'Structured', color: 'bg-status-green/20 text-status-green' },
};

export function TemplateLibrary({ onSelect }: TemplateLibraryProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PromptTemplate | null>(null);

  const handleSelect = (template: PromptTemplate) => {
    onSelect(template);
    setOpen(false);
    setPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BookTemplate className="h-4 w-4" />
          Template Library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="h-5 w-5 text-primary" />
            Prompt Template Library
          </DialogTitle>
          <DialogDescription>
            Select a framework to scaffold your prompt. Variables like {'{{var}}'} can be customized after insertion.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-3">
            {PROMPT_TEMPLATES.map((template) => {
              const config = TYPE_CONFIG[template.type];
              const Icon = config.icon;
              const isPreview = preview?.id === template.id;

              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary/30 ${
                    isPreview ? 'border-primary/50 ring-1 ring-primary/20' : ''
                  }`}
                  onClick={() => setPreview(isPreview ? null : template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">{template.name}</span>
                          <Badge variant="secondary" className={`text-[10px] ${config.color}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                        {template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.variables.slice(0, 4).map(v => (
                              <Badge key={v} variant="outline" className="text-[10px] font-mono">
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                            {template.variables.length > 4 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{template.variables.length - 4} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleSelect(template); }}
                      >
                        Use
                      </Button>
                    </div>
                    {isPreview && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                          {template.content}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
