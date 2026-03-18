
-- Insert mock prompt assets
INSERT INTO prompt_assets (id, title, content, version, status, department, category, security_status, created_by, tags, commit_message) VALUES
('a0000001-0000-0000-0000-000000000001', 'Customer Sentiment Analysis', 'Analyze the following customer feedback and classify sentiment as positive, negative, or neutral. Provide confidence scores and key phrases driving the sentiment.\n\nInput: {{customer_feedback}}\nOutput format: JSON with fields: sentiment, confidence, key_phrases, summary', 1.2, 'released', 'Marketing', 'Analysis', 'GREEN', '9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f', ARRAY['sentiment','nlp','customer'], 'Approved after legal review'),
('a0000002-0000-0000-0000-000000000002', 'Contract Clause Extractor', 'You are a senior legal analyst. Extract all key clauses from the following contract document.\n\nFor each clause identify:\n- Clause type (indemnity, liability, termination, etc.)\n- Risk level (high/medium/low)\n- Plain language summary\n\nContract:\n{{contract_text}}', 2.0, 'released', 'Legal', 'Extraction', 'GREEN', '1dd417c4-9083-4e35-94af-bd35646c0d47', ARRAY['legal','contracts','extraction'], 'v2 with improved risk classification'),
('a0000003-0000-0000-0000-000000000003', 'Incident Root Cause Analyzer', 'Given the following operational incident report, perform a root cause analysis using the 5-Whys methodology.\n\nIncident: {{incident_description}}\nTimeline: {{timeline}}\nAffected systems: {{systems}}\n\nProvide: root cause, contributing factors, and recommended preventive actions.', 1.0, 'in_review', 'Operations', 'Analysis', 'AMBER', '455c9f86-3516-4f6a-b51c-f0985167e0aa', ARRAY['operations','incident','rca'], 'Initial draft for ops team review'),
('a0000004-0000-0000-0000-000000000004', 'R&D Experiment Summary Generator', 'Summarize the following experimental results into a structured report.\n\nExperiment ID: {{exp_id}}\nHypothesis: {{hypothesis}}\nData: {{raw_data}}\n\nOutput sections: Abstract, Methodology recap, Key findings, Statistical significance, Next steps.', 1.1, 'approved', 'R&D', 'Summarization', 'GREEN', '471ba9d5-ceef-450d-8c0c-a18d5eeb32d5', ARRAY['research','experiment','summary'], 'Added statistical significance section'),
('a0000005-0000-0000-0000-000000000005', 'Financial Risk Assessment Prompt', 'Assess the financial risk of the following investment proposal.\n\nProposal: {{proposal_details}}\nMarket conditions: {{market_data}}\nHistorical performance: {{history}}\n\nProvide: risk score (1-10), risk factors, mitigation strategies, ROI projection.', 1.0, 'draft', 'Finance', 'Analysis', 'PENDING', '455c9f86-3516-4f6a-b51c-f0985167e0aa', ARRAY['finance','risk','investment'], 'Initial creation'),
('a0000006-0000-0000-0000-000000000006', 'Employee Onboarding FAQ Generator', 'Generate a comprehensive FAQ document for new employees based on the following company policies.\n\nPolicies: {{policy_docs}}\nDepartment: {{department}}\nRole level: {{role_level}}\n\nFormat: Q&A pairs grouped by topic. Tone: friendly, professional.', 1.3, 'released', 'HR', 'Generation', 'GREEN', '1dd417c4-9083-4e35-94af-bd35646c0d47', ARRAY['hr','onboarding','faq'], 'Final version approved by HR director'),
('a0000007-0000-0000-0000-000000000007', 'IT Security Policy Compliance Checker', 'Review the following IT infrastructure configuration against our security policy standards.\n\nConfig: {{infra_config}}\nPolicy version: {{policy_version}}\n\nCheck for: firewall rules, encryption standards, access controls, logging compliance.\nOutput: compliance score, violations list, remediation steps.', 1.0, 'in_review', 'IT', 'Compliance', 'GREEN', '9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f', ARRAY['security','compliance','infrastructure'], 'Ready for IT lead review'),
('a0000008-0000-0000-0000-000000000008', 'Executive Strategy Brief Generator', 'Create a concise executive strategy brief from the following market analysis and internal performance data.\n\n{{market_analysis}}\n{{performance_data}}\n\nInclude: Executive summary (3 sentences), Key metrics table, Strategic recommendations (top 3), Risk factors, Timeline.', 2.1, 'released', 'Executive', 'Summarization', 'GREEN', '455c9f86-3516-4f6a-b51c-f0985167e0aa', ARRAY['executive','strategy','briefing'], 'Quarterly update format finalized');

-- Assign reviewers
UPDATE prompt_assets SET assigned_to = '471ba9d5-ceef-450d-8c0c-a18d5eeb32d5' WHERE id = 'a0000003-0000-0000-0000-000000000003';
UPDATE prompt_assets SET assigned_to = '455c9f86-3516-4f6a-b51c-f0985167e0aa' WHERE id = 'a0000007-0000-0000-0000-000000000007';

-- Version snapshots
INSERT INTO version_snapshots (asset_id, version, content, title, commit_message, user_id) VALUES
('a0000001-0000-0000-0000-000000000001', 1.0, 'Analyze customer feedback for sentiment.', 'Customer Sentiment Analysis', 'Initial creation', '9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f'),
('a0000001-0000-0000-0000-000000000001', 1.2, 'Analyze the following customer feedback and classify sentiment.', 'Customer Sentiment Analysis', 'Approved after legal review', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000002-0000-0000-0000-000000000002', 1.0, 'Extract key clauses from contract.', 'Contract Clause Extractor', 'Initial creation', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000002-0000-0000-0000-000000000002', 2.0, 'You are a senior legal analyst. Extract all key clauses.', 'Contract Clause Extractor', 'v2 with improved risk classification', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000004-0000-0000-0000-000000000004', 1.0, 'Summarize experimental results.', 'R&D Experiment Summary Generator', 'Initial creation', '471ba9d5-ceef-450d-8c0c-a18d5eeb32d5'),
('a0000004-0000-0000-0000-000000000004', 1.1, 'Summarize the following experimental results into a structured report.', 'R&D Experiment Summary Generator', 'Added statistical significance section', '471ba9d5-ceef-450d-8c0c-a18d5eeb32d5'),
('a0000006-0000-0000-0000-000000000006', 1.0, 'Generate FAQ for new employees.', 'Employee Onboarding FAQ Generator', 'Initial creation', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000006-0000-0000-0000-000000000006', 1.3, 'Generate a comprehensive FAQ document.', 'Employee Onboarding FAQ Generator', 'Final version approved by HR director', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000008-0000-0000-0000-000000000008', 1.0, 'Create executive strategy brief.', 'Executive Strategy Brief Generator', 'Initial creation', '455c9f86-3516-4f6a-b51c-f0985167e0aa'),
('a0000008-0000-0000-0000-000000000008', 2.1, 'Create a concise executive strategy brief.', 'Executive Strategy Brief Generator', 'Quarterly update format finalized', '455c9f86-3516-4f6a-b51c-f0985167e0aa');

-- ROI facts
INSERT INTO roi_facts (asset_id, category, value, description) VALUES
('a0000001-0000-0000-0000-000000000001', 'Time Savings', 7800, 'Automated sentiment analysis saves 2hrs/week'),
('a0000001-0000-0000-0000-000000000001', 'Efficiency', 12000, '20% faster campaign response'),
('a0000002-0000-0000-0000-000000000002', 'Time Savings', 15000, 'Contract review reduced from 3 days to 4 hours'),
('a0000002-0000-0000-0000-000000000002', 'Risk Mitigation', 50000, 'Early clause risk detection prevents exposure'),
('a0000002-0000-0000-0000-000000000002', 'Cost Savings', 8000, 'Reduced external legal counsel hours'),
('a0000004-0000-0000-0000-000000000004', 'Time Savings', 5200, 'Automated report generation saves 1hr/experiment'),
('a0000004-0000-0000-0000-000000000004', 'New Value', 20000, 'Faster experiment iteration cycle'),
('a0000006-0000-0000-0000-000000000006', 'Time Savings', 3000, 'Onboarding FAQ reduces HR queries by 40%'),
('a0000006-0000-0000-0000-000000000006', 'Efficiency', 6000, 'New hire productivity improved by 15%'),
('a0000008-0000-0000-0000-000000000008', 'Time Savings', 10000, 'Executive briefing prep reduced by 80%'),
('a0000008-0000-0000-0000-000000000008', 'Cost Savings', 25000, 'Eliminated external strategy consulting'),
('a0000008-0000-0000-0000-000000000008', 'New Value', 30000, 'Data-driven strategic pivots'),
('a0000003-0000-0000-0000-000000000003', 'Risk Mitigation', 40000, 'Faster incident response reduces downtime costs'),
('a0000007-0000-0000-0000-000000000007', 'Risk Mitigation', 75000, 'Proactive compliance prevents breach penalties');

-- Lineage entries
INSERT INTO lineage_entries (asset_id, parent_id, action, user_id) VALUES
('a0000001-0000-0000-0000-000000000001', NULL, 'created', '9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f'),
('a0000001-0000-0000-0000-000000000001', NULL, 'released', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000002-0000-0000-0000-000000000002', NULL, 'created', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000002-0000-0000-0000-000000000002', NULL, 'released', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000003-0000-0000-0000-000000000003', NULL, 'created', '455c9f86-3516-4f6a-b51c-f0985167e0aa'),
('a0000004-0000-0000-0000-000000000004', NULL, 'created', '471ba9d5-ceef-450d-8c0c-a18d5eeb32d5'),
('a0000005-0000-0000-0000-000000000005', NULL, 'created', '455c9f86-3516-4f6a-b51c-f0985167e0aa'),
('a0000006-0000-0000-0000-000000000006', NULL, 'created', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000006-0000-0000-0000-000000000006', NULL, 'released', '1dd417c4-9083-4e35-94af-bd35646c0d47'),
('a0000007-0000-0000-0000-000000000007', NULL, 'created', '9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f'),
('a0000008-0000-0000-0000-000000000008', NULL, 'created', '455c9f86-3516-4f6a-b51c-f0985167e0aa'),
('a0000008-0000-0000-0000-000000000008', NULL, 'released', '455c9f86-3516-4f6a-b51c-f0985167e0aa');

-- Comments
INSERT INTO prompt_comments (prompt_id, user_id, content) VALUES
('a0000001-0000-0000-0000-000000000001', '1dd417c4-9083-4e35-94af-bd35646c0d47', 'Looks good. Please add confidence score thresholds for actionable insights.'),
('a0000001-0000-0000-0000-000000000001', '9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f', 'Done — added 0.8 threshold for high-confidence classifications.'),
('a0000002-0000-0000-0000-000000000002', '455c9f86-3516-4f6a-b51c-f0985167e0aa', 'Can we add indemnity clause detection as a priority? Critical for Q1 contracts.'),
('a0000002-0000-0000-0000-000000000002', '1dd417c4-9083-4e35-94af-bd35646c0d47', 'Added indemnity as high-priority clause type in v2.0.'),
('a0000003-0000-0000-0000-000000000003', '471ba9d5-ceef-450d-8c0c-a18d5eeb32d5', 'The 5-Whys approach is solid but consider adding Fishbone diagram output too.'),
('a0000007-0000-0000-0000-000000000007', '455c9f86-3516-4f6a-b51c-f0985167e0aa', 'Please ensure this checks against ISO 27001 controls, not just internal policies.'),
('a0000008-0000-0000-0000-000000000008', '9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f', 'Great format. The 3-sentence executive summary constraint works perfectly.');

-- Audit logs
INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES
('9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f', 'create', 'prompt_asset', 'a0000001-0000-0000-0000-000000000001', '{"version": 1.0}'),
('1dd417c4-9083-4e35-94af-bd35646c0d47', 'approve_release', 'prompt_asset', 'a0000001-0000-0000-0000-000000000001', '{"version": 1.2}'),
('1dd417c4-9083-4e35-94af-bd35646c0d47', 'create', 'prompt_asset', 'a0000002-0000-0000-0000-000000000002', '{"version": 1.0}'),
('455c9f86-3516-4f6a-b51c-f0985167e0aa', 'create', 'prompt_asset', 'a0000003-0000-0000-0000-000000000003', '{"version": 1.0}'),
('455c9f86-3516-4f6a-b51c-f0985167e0aa', 'submit_for_review', 'prompt_asset', 'a0000003-0000-0000-0000-000000000003', '{"assigned_to": "471ba9d5"}'),
('471ba9d5-ceef-450d-8c0c-a18d5eeb32d5', 'create', 'prompt_asset', 'a0000004-0000-0000-0000-000000000004', '{"version": 1.0}'),
('455c9f86-3516-4f6a-b51c-f0985167e0aa', 'create', 'prompt_asset', 'a0000005-0000-0000-0000-000000000005', '{"version": 1.0}'),
('1dd417c4-9083-4e35-94af-bd35646c0d47', 'create', 'prompt_asset', 'a0000006-0000-0000-0000-000000000006', '{"version": 1.0}'),
('9aeb46bc-9f4c-493b-ae3f-b544f4c6b31f', 'create', 'prompt_asset', 'a0000007-0000-0000-0000-000000000007', '{"version": 1.0}'),
('455c9f86-3516-4f6a-b51c-f0985167e0aa', 'create', 'prompt_asset', 'a0000008-0000-0000-0000-000000000008', '{"version": 1.0}'),
('455c9f86-3516-4f6a-b51c-f0985167e0aa', 'approve_release', 'prompt_asset', 'a0000008-0000-0000-0000-000000000008', '{"version": 2.1}');
