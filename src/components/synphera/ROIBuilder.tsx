import { useCallback, useEffect, useState } from 'react';
import { ROICategory, ROI_CATEGORIES } from '@/lib/synphera-types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

export interface ROIEntry {
  category: ROICategory;
  value: number;
  description: string;
}

interface ROIBuilderProps {
  entries: ROIEntry[];
  onChange: (entries: ROIEntry[]) => void;
  department?: string;
  autoOpenCategory?: ROICategory | null;
  onAutoOpenHandled?: () => void;
  outcomePercentages?: Partial<Record<ROICategory, number>>;
}

export function ROIBuilder({ entries, onChange, department, autoOpenCategory, onAutoOpenHandled, outcomePercentages }: ROIBuilderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ROICategory | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editDescription, setEditDescription] = useState('');

  const openCategoryDialog = useCallback((category: ROICategory) => {
    const existing = entries.find(e => e.category === category);
    setSelectedCategory(category);
    setEditValue(existing?.value || 0);
    setEditDescription(existing?.description || '');
    setDialogOpen(true);
  }, [entries]);

  const handleSaveBenefit = () => {
    if (!selectedCategory) return;
    const updated = entries.filter(e => e.category !== selectedCategory);
    if (editValue !== 0 || editDescription.trim()) {
      updated.push({ category: selectedCategory, value: editValue, description: editDescription.trim() });
    }
    onChange(updated);
    setDialogOpen(false);
  };

  const handleRemoveBenefit = () => {
    if (!selectedCategory) return;
    onChange(entries.filter(e => e.category !== selectedCategory));
    setDialogOpen(false);
  };

  useEffect(() => {
    if (!autoOpenCategory) {
      return;
    }

    openCategoryDialog(autoOpenCategory);
    onAutoOpenHandled?.();
  }, [autoOpenCategory, openCategoryDialog, onAutoOpenHandled]);

  return (
    <div className="space-y-3">
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Category</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Value (%)</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs w-16"></th>
            </tr>
          </thead>
          <tbody>
            {ROI_CATEGORIES.map((category) => {
              const entry = entries.find(e => e.category === category);
              const outcomePercentage = outcomePercentages?.[category];
              const isSuggested = typeof outcomePercentage === 'number';
              return (
                <tr
                  key={category}
                  className={`border-b border-border last:border-b-0 cursor-pointer transition-colors ${isSuggested ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/20'}`}
                  onClick={() => openCategoryDialog(category)}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{category}</span>
                      {isSuggested && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Suggested</span>}
                    </div>
                    {typeof outcomePercentage === 'number' && (
                      <p className="text-[10px] text-primary mt-0.5">Outcome score: {outcomePercentage.toFixed(1)}%</p>
                    )}
                    {entry?.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{entry.description}</p>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {entry ? (
                      <span className={`font-mono text-sm font-medium ${entry.value >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                        {entry.value > 0 ? '+' : ''}{entry.value}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openCategoryDialog(category); }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Benefit Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Benefit Description</Label>
              <Textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Describe the expected benefit in detail..."
                className="bg-card text-sm min-h-[100px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Value (% — positive or negative)</Label>
              <Input
                type="number"
                step="any"
                value={editValue || ''}
                onChange={e => setEditValue(parseFloat(e.target.value) || 0)}
                placeholder="e.g., 5 or -2.5"
                className="font-mono bg-card"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {entries.find(e => e.category === selectedCategory) && (
              <Button variant="outline" className="text-destructive" onClick={handleRemoveBenefit}>Remove</Button>
            )}
            <Button onClick={handleSaveBenefit}>Save Benefit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
