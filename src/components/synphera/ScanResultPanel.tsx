import { ScanResult, SecurityFinding } from '@/lib/synphera-types';
import { getSeverityLabel } from '@/lib/security-scanner';
import { SecurityBadge } from './SecurityBadge';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanResultPanelProps {
  result: ScanResult | null;
  isScanning?: boolean;
}

export function ScanResultPanel({ result, isScanning }: ScanResultPanelProps) {
  if (isScanning) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-card p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse" />
        <div className="relative flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
          <div>
            <p className="font-medium text-foreground">Scanning for PII & Compliance Issues...</p>
            <p className="text-sm text-muted-foreground">
              Checking patterns: emails, phones, SSN, IBAN, health data, criminal records...
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
        <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Run a security scan before saving to the library
        </p>
      </div>
    );
  }
  
  const statusConfig = {
    GREEN: {
      icon: CheckCircle,
      title: '✅ Security Scan Passed',
      description: 'No sensitive data patterns detected. Asset is cleared for the library.',
      bgClass: 'bg-status-green/10 border-status-green/30',
    },
    AMBER: {
      icon: AlertTriangle,
      title: '⚠️ Potential Issues Detected',
      description: 'Medium-severity patterns found. Review findings and provide justification to proceed.',
      bgClass: 'bg-status-amber/10 border-status-amber/30',
    },
    RED: {
      icon: XCircle,
      title: '🚨 CRITICAL: Save Blocked',
      description: 'High-severity sensitive data detected. Cannot save until content is remediated.',
      bgClass: 'bg-status-red/10 border-status-red/30',
    },
    PENDING: {
      icon: Clock,
      title: 'Scan Pending',
      description: 'Run security scan to proceed.',
      bgClass: 'bg-muted border-border',
    },
  };
  
  const { icon: Icon, title, description, bgClass } = statusConfig[result.status];
  
  return (
    <div className={cn('rounded-lg border p-6 space-y-4', bgClass)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon className={cn('h-6 w-6', {
            'text-status-green': result.status === 'GREEN',
            'text-status-amber': result.status === 'AMBER',
            'text-status-red': result.status === 'RED',
          })} />
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <SecurityBadge status={result.status} />
      </div>
      
      {result.findings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            Findings ({result.findings.length})
          </h4>
          <div className="log-box space-y-1">
            {result.findings.map((finding, index) => (
              <FindingLine key={index} finding={finding} />
            ))}
          </div>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Scan completed in {result.scanDuration.toFixed(2)}ms at {result.timestamp.toLocaleTimeString()}
      </p>
    </div>
  );
}

function FindingLine({ finding }: { finding: SecurityFinding }) {
  const severityEmoji = {
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🟢',
  };
  
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span>{severityEmoji[finding.severity]}</span>
      <span className="text-muted-foreground">[{finding.severity}]</span>
      <span className="text-foreground">{getSeverityLabel(finding.type)}</span>
      {finding.line && (
        <span className="text-muted-foreground">Line {finding.line}</span>
      )}
      <span className="text-primary/70">Hash: {finding.hash}</span>
    </div>
  );
}