
-- Drop the unique constraint on department_id to allow multiple configs per department
ALTER TABLE roi_configs DROP CONSTRAINT IF EXISTS roi_configs_department_id_key;

-- Insert ROI configs (multiple per department)
INSERT INTO roi_configs (department_id, category, formula, weight) VALUES
('0007254a-4e4e-493d-b38a-469d9c7ac057', 'Cost Savings', 'headcount_saved * avg_salary', 1.5),
('0007254a-4e4e-493d-b38a-469d9c7ac057', 'Time Savings', 'hours_saved * hourly_rate * 52', 1.2),
('36581d63-fb85-489a-b85e-df58e0736166', 'Risk Mitigation', 'probability * potential_loss', 2.0),
('36581d63-fb85-489a-b85e-df58e0736166', 'Time Savings', 'review_hours_saved * lawyer_rate', 1.8),
('45e9ebef-e139-41d8-8a5e-0b10e74e1d75', 'New Value', 'experiments_accelerated * value_per_discovery', 1.5),
('b17d6a28-b229-4431-9f07-8aab1d8e2030', 'Efficiency', 'campaign_throughput_increase * revenue_per_campaign', 1.3),
('a08d74c6-44e0-43a4-8b5a-4719eb983060', 'Cost Savings', 'manual_processes_eliminated * cost_per_process', 1.7),
('8590ef13-5874-4aa9-8950-3617826a9f54', 'Time Savings', 'hr_queries_reduced * avg_resolution_time * hourly_rate', 1.1);
