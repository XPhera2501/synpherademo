import { useState } from 'react';
import { ROICategory, ROI_CATEGORIES } from '@/lib/synphera-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Plus, X, DollarSign } from 'lucide-react';

interface ROIEntry {
  category: ROICategory;
  value: number;
}

interface ROIBuilderProps {
  entries: ROIEntry[];
  onChange: (entries: ROIEntry[]) => void;
}

const CATEGORY_TOOLTIPS: Record<ROICategory, string> = {
  'Time Savings': 'Hours saved × hourly rate × frequency. E.g., 2hrs/week × $75 × 52 weeks = $7,800/yr',
  'Risk Mitigation': 'Probability of incident × potential loss avoided. E.g., 5% chance × $100k loss = $5,000',
  'Efficiency': 'Throughput increase × value per unit. E.g., 20% more output × $50k baseline = $10,000',
  'Cost Savings': 'Direct costs reduced: licenses, vendors, manual processes eliminated',
  'New Value': 'Revenue enabled, new capabilities monetized, competitive advantage gained',
};

const CATEGORY_ICONS: Record<ROICategory, string> = {
  'Time Savings': '⏱️',
  'Risk Mitigation': '🛡️',
  'Efficiency': '📈',
  'Cost Savings': '💰',
  'New Value': '✨',
};

export function ROIBuilder({ entries, onChange }: ROIBuilderProps) {
  const [selectedCategories, setSelectedCategories] = useState<ROICategory[]>(
    entries.map(e => e.category)
  );
  
  const handleCategoryToggle = (category: ROICategory, checked: boolean) => {
    if (checked) {
      setSelectedCategories([...selectedCategories, category]);
      onChange([...entries, { category, value: 0 }]);
    } else {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
      onChange(entries.filter(e => e.category !== category));
    }
  };
  
  const handleValueChange = (category: ROICategory, value: number) => {
    onChange(entries.map(e => 
      e.category === category ? { ...e, value } : e
    ));
  };
  
  const totalROI = entries.reduce((sum, e) => sum + e.value, 0);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">ROI Value Builder</Label>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="font-mono font-semibold text-primary">
            ${totalROI.toLocaleString()}
          </span>
          <span className="text-muted-foreground">total value</span>
        </div>
      </div>
      
      <div className="grid gap-3">
        {ROI_CATEGORIES.map((category) => {
          const isSelected = selectedCategories.includes(category);
          const entry = entries.find(e => e.category === category);
          
          return (
            <div 
              key={category}
              className={`rounded-lg border p-3 transition-colors ${
                isSelected ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id={category}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleCategoryToggle(category, !!checked)}
                />
                <span className="text-lg">{CATEGORY_ICONS[category]}</span>
                <Label 
                  htmlFor={category}
                  className="flex-1 cursor-pointer text-sm font-medium"
                >
                  {category}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">{CATEGORY_TOOLTIPS[category]}</p>
                  </TooltipContent>
                </Tooltip>
                
                {isSelected && (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={entry?.value || ''}
                      onChange={(e) => handleValueChange(category, parseInt(e.target.value) || 0)}
                      className="h-8 w-28 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}