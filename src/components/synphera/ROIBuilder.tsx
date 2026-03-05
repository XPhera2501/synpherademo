import { useState, useEffect } from 'react';
import { ROICategory, ROI_CATEGORIES } from '@/lib/synphera-types';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface ROIEntry {
  category: ROICategory;
  value: number;
}

interface ROIBuilderProps {
  entries: ROIEntry[];
  onChange: (entries: ROIEntry[]) => void;
  department?: string;
}

const CATEGORY_UNITS: Record<ROICategory, { suffix: string; placeholder: string }> = {
  'Time': { suffix: 'hr', placeholder: 'e.g., -4' },
  'Earlier Reaction': { suffix: 'days', placeholder: 'e.g., 2' },
  'Waste Reduction': { suffix: 'kg/Tn', placeholder: 'e.g., 50' },
  'Improved Price Negotiation': { suffix: '', placeholder: 'e.g., -0.05' },
};

export function ROIBuilder({ entries, onChange, department }: ROIBuilderProps) {
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

  return (
    <div className="space-y-3">
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs w-8"></th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Category</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground text-xs">Value</th>
            </tr>
          </thead>
          <tbody>
            {ROI_CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category);
              const entry = entries.find(e => e.category === category);
              const unitConfig = CATEGORY_UNITS[category];

              return (
                <tr key={category} className="border-b border-border last:border-b-0">
                  <td className="py-2 px-3">
                    <Checkbox
                      id={category}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleCategoryToggle(category, !!checked)}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <Label htmlFor={category} className="cursor-pointer text-sm font-medium">
                      {category}
                    </Label>
                  </td>
                  <td className="py-2 px-3 text-right">
                    {isSelected ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Input
                          type="number"
                          step="any"
                          placeholder={unitConfig.placeholder}
                          value={entry?.value || ''}
                          onChange={(e) => handleValueChange(category, parseFloat(e.target.value) || 0)}
                          className="h-7 w-24 font-mono text-right text-xs"
                        />
                        {unitConfig.suffix && (
                          <span className="text-xs text-muted-foreground w-8">{unitConfig.suffix}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
