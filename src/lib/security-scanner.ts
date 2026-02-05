// Synphera V13 - Advanced PII & Compliance Scanner
import SHA256 from 'crypto-js/sha256';
import { SecurityFinding, ScanResult, SecurityStatus } from './synphera-types';

// Pattern definitions for sensitive data detection
const PATTERNS = {
  // Email patterns - comprehensive
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  
  // Phone patterns - international formats
  phone: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // IBAN pattern - European bank accounts
  iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/gi,
  
  // Passport patterns - various countries
  passport: /\b[A-Z]{1,2}\d{6,9}\b/gi,
  
  // SSN pattern - US Social Security
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  
  // Credit card patterns - major networks
  credit_card: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
};

// Health-related keywords (HIPAA concerns)
const HEALTH_KEYWORDS = [
  'diagnosis', 'prescription', 'patient', 'medical record', 'treatment plan',
  'health condition', 'blood type', 'allergies', 'medication', 'hospital',
  'surgery', 'symptoms', 'chronic', 'mental health', 'HIV', 'AIDS', 
  'cancer', 'diabetes', 'psychiatric', 'therapy session', 'dosage',
  'ICD-10', 'CPT code', 'PHI', 'protected health'
];

// Criminal/legal keywords
const CRIMINAL_KEYWORDS = [
  'criminal record', 'arrest', 'conviction', 'felony', 'misdemeanor',
  'probation', 'parole', 'indictment', 'plea deal', 'warrant',
  'mugshot', 'sentence', 'incarceration', 'bail', 'defendant'
];

// Proprietary markers (company-specific)
const PROPRIETARY_MARKERS = [
  'X-Phera', 'SynPhera™', 'SYNPHERA', 'X-PHERA', 'Phera-Core',
  'CONFIDENTIAL:', 'TOP SECRET', 'INTERNAL ONLY', 'DO NOT DISTRIBUTE',
  'PROPRIETARY', 'TRADE SECRET', '© SynPhera', 'Patent Pending'
];

function hashValue(value: string): string {
  return SHA256(value).toString().substring(0, 16);
}

function findPatternMatches(
  content: string,
  pattern: RegExp,
  type: SecurityFinding['type'],
  severity: SecurityFinding['severity']
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const matches = line.match(pattern);
    if (matches) {
      matches.forEach(match => {
        findings.push({
          type,
          value: match.substring(0, 4) + '***' + match.substring(match.length - 2),
          hash: hashValue(match),
          severity,
          line: lineIndex + 1
        });
      });
    }
  });
  
  return findings;
}

function findKeywordMatches(
  content: string,
  keywords: string[],
  type: SecurityFinding['type'],
  severity: SecurityFinding['severity']
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lowerContent = content.toLowerCase();
  const lines = content.split('\n');
  
  keywords.forEach(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerContent.includes(lowerKeyword)) {
      // Find the line number
      const lineIndex = lines.findIndex(line => 
        line.toLowerCase().includes(lowerKeyword)
      );
      
      findings.push({
        type,
        value: keyword,
        hash: hashValue(keyword),
        severity,
        line: lineIndex + 1
      });
    }
  });
  
  return findings;
}

export function runSecurityScan(content: string, title: string): ScanResult {
  const startTime = performance.now();
  const allFindings: SecurityFinding[] = [];
  const fullContent = `${title}\n${content}`;
  
  // Pattern-based detection (HIGH severity)
  allFindings.push(...findPatternMatches(fullContent, PATTERNS.email, 'email', 'HIGH'));
  allFindings.push(...findPatternMatches(fullContent, PATTERNS.phone, 'phone', 'MEDIUM'));
  allFindings.push(...findPatternMatches(fullContent, PATTERNS.iban, 'iban', 'HIGH'));
  allFindings.push(...findPatternMatches(fullContent, PATTERNS.passport, 'passport', 'HIGH'));
  allFindings.push(...findPatternMatches(fullContent, PATTERNS.ssn, 'ssn', 'HIGH'));
  allFindings.push(...findPatternMatches(fullContent, PATTERNS.credit_card, 'credit_card', 'HIGH'));
  
  // Keyword-based detection
  allFindings.push(...findKeywordMatches(fullContent, HEALTH_KEYWORDS, 'health', 'MEDIUM'));
  allFindings.push(...findKeywordMatches(fullContent, CRIMINAL_KEYWORDS, 'criminal', 'HIGH'));
  allFindings.push(...findKeywordMatches(fullContent, PROPRIETARY_MARKERS, 'proprietary', 'HIGH'));
  
  // Deduplicate findings by hash
  const uniqueFindings = allFindings.filter((finding, index, self) =>
    index === self.findIndex(f => f.hash === finding.hash)
  );
  
  // Determine overall status
  let status: SecurityStatus = 'GREEN';
  
  const hasHighSeverity = uniqueFindings.some(f => f.severity === 'HIGH');
  const hasMediumSeverity = uniqueFindings.some(f => f.severity === 'MEDIUM');
  const hasProprietary = uniqueFindings.some(f => f.type === 'proprietary');
  const hasCriminal = uniqueFindings.some(f => f.type === 'criminal');
  
  if (hasHighSeverity || hasProprietary || hasCriminal) {
    status = 'RED';
  } else if (hasMediumSeverity) {
    status = 'AMBER';
  }
  
  const endTime = performance.now();
  
  return {
    status,
    findings: uniqueFindings,
    timestamp: new Date(),
    scanDuration: endTime - startTime
  };
}

export function getSeverityLabel(type: SecurityFinding['type']): string {
  const labels: Record<SecurityFinding['type'], string> = {
    email: '📧 Email Address',
    phone: '📞 Phone Number',
    iban: '🏦 Bank Account (IBAN)',
    passport: '🛂 Passport Number',
    health: '🏥 Health Information',
    criminal: '⚖️ Criminal Record Data',
    proprietary: '🔒 Proprietary Marker',
    ssn: '🆔 Social Security Number',
    credit_card: '💳 Credit Card Number'
  };
  return labels[type];
}