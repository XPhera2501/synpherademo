import { useState, useEffect } from 'react';
import { ROICategory, ROI_CATEGORIES } from '@/lib/synphera-types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, DollarSign, Sparkles } from 'lucide-react';

interface ROIEntry {
  category: ROICategory;
  value: number;
}

interface ROIConfig {
  category: string;
  formula: string;
  weight: number | null;
  department_id: string | null;
}

interface ROIBuilderProps {
  entries: ROIEntry[];
  onChange: (entries: ROIEntry[]) => void;
  department?: string;
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

// Unit configuration per category
const CATEGORY_UNITS: Record<ROICategory, { label: string; prefix: string; suffix: string; placeholder: string }> = {
  'Time Savings': { label: 'Hours saved', prefix: '', suffix: 'hrs', placeholder: 'e.g., 40' },
  'Risk Mitigation': { label: 'Value ($)', prefix: '$', suffix: '', placeholder: 'e.g., 5000' },
  'Efficiency': { label: 'Percentage gain', prefix: '', suffix: '%', placeholder: 'e.g., 20' },
  'Cost Savings': { label: 'Amount ($)', prefix: '$', suffix: '', placeholder: 'e.g., 12000' },
  'New Value': { label: 'Revenue ($)', prefix: '$', suffix: '', placeholder: 'e.g., 25000' },
};

export function ROIBuilder({ entries, onChange, department }: ROIBuilderProps) {
  const [selectedCategories, setSelectedCategories] = useState<ROICategory[]>(
    entries.map(e => e.category)
  );
  const [deptConfigs, setDeptConfigs] = useState<ROIConfig[]>([]);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchConfigs = async () => {
      const { data } = await supabase.from('roi_configs').select('*');
      if (!data) return;
      setDeptConfigs(data);

      if (department) {
        const { data: deptData } = await supabase.from('departments').select('id').eq('name', department).maybeSingle();
        const deptId = deptData?.id;

        const matching = data.filter(c =>
          c.department_id === deptId || c.department_id === null
        );

        const sorted = matching.sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1));
        const preferred = sorted.map(c => c.category);
        setPreferredCategories([...new Set(preferred)]);

        if (entries.length === 0 && preferred.length > 0) {
          const topCategories = preferred.slice(0, 2) as ROICategory[];
          const validCategories = topCategories.filter(c => ROI_CATEGORIES.includes(c));
          if (validCategories.length > 0) {
            setSelectedCategories(validCategories);
            onChange(validCategories.map(c => ({ category: c, value: 0 })));
          }
        }
      }
    };
    fetchConfigs();
  }, [department]);

  const getFormulaHint = (category: ROICategory): string | null => {
    const config = deptConfigs.find(c => c.category === category);
    return config?.formula || null;
  };
  
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

  const sortedCategories = [...ROI_CATEGORIES].sort((a, b) => {
    const aIdx = preferredCategories.indexOf(a);
    const bIdx = preferredCategories.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return 0;
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Benefit Value Builder</Label>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="font-mono font-semibold text-primary">
            ${totalROI.toLocaleString()}
          </span>
          <span className="text-muted-foreground">total value</span>
        </div>
      </div>

      {preferredCategories.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Categories pre-selected based on <strong>{department}</strong> department priorities</span>
        </div>
      )}
      
      <div className="grid gap-3">
        {sortedCategories.map((category) => {
          const isSelected = selectedCategories.includes(category);
          const entry = entries.find(e => e.category === category);
          const isPreferred = preferredCategories.includes(category);
          const formulaHint = getFormulaHint(category);
          const unitConfig = CATEGORY_UNITS[category];
          
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
                  className="flex-1 cursor-pointer text-sm font-medium flex items-center gap-1.5"
                >
                  {category}
                  {isPreferred && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/30 text-primary">
                      Recommended
                    </Badge>
                  )}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">{CATEGORY_TOOLTIPS[category]}</p>
                    {formulaHint && (
                      <p className="text-xs text-primary mt-1">Dept formula: <code>{formulaHint}</code></p>
                    )}
                  </TooltipContent>
                </Tooltip>
                
                {isSelected && (
                  <div className="flex items-center gap-1">
                    {unitConfig.prefix && <span className="text-muted-foreground text-sm">{unitConfig.prefix}</span>}
                    <Input
                      type="number"
                      placeholder={unitConfig.placeholder}
                      value={entry?.value || ''}
                      onChange={(e) => handleValueChange(category, parseInt(e.target.value) || 0)}
                      className="h-8 w-28 font-mono"
                    />
                    {unitConfig.suffix && <span className="text-muted-foreground text-xs">{unitConfig.suffix}</span>}
                  </div>
                )}
              </div>
              {isSelected && (
                <p className="text-[10px] text-muted-foreground mt-1 ml-10">
                  Unit: {unitConfig.label}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
