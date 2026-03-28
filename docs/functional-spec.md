# Synphera Prompt Intelligence Suite Functional Specification

## 1. Purpose

Synphera Prompt Intelligence Suite is an enterprise web application for creating, validating, reviewing, approving, cataloguing, executing, and auditing prompt assets. The application combines workflow governance, security validation, ROI capture, version history, and role-based access control so prompts can move from authoring to approved operational assets.

## 2. Product Scope

The application supports:

- public landing and informational content
- user sign-up, sign-in, password reset, and session management
- prompt authoring and ingestion
- security and compliance validation
- benefit and ROI data capture
- governed lifecycle workflow from Draft to Approved
- review, creator rework, and approver decision loops
- searchable catalogue for working and approved assets
- audit logs, lineage, comments, and version history
- admin management for users, roles, departments, managers, ROI formulas, and landing content
- analytics dashboards for workflow, ROI, reuse, and department activity

## 3. User Roles

### 3.1 Viewer

- can sign in and browse visible catalogue items
- can view approved prompts
- cannot create, edit, review, or approve prompts

### 3.2 Creator

- can create new prompt assets
- can save drafts
- can save prompts to Created
- can assign prompts for review
- can edit own Draft prompts
- can edit prompts returned for creator rework while they remain In Review

### 3.3 Reviewer

- can claim or receive prompts for review
- can edit prompts in reviewer review phase
- can return prompts to creator
- can submit prompts to approver review

### 3.4 Approver

- can review prompts routed to them by manager-based approval routing
- can return prompts to creator
- can approve prompts

### 3.5 Admin

- has all creator, reviewer, and approver capabilities
- manages users, roles, departments, managers, ROI configuration, and content
- can administer governance data and audit information

### 3.6 Super Admin

- has all admin capabilities
- can assign or manage super admin access where allowed by policy

## 4. Application Areas

### 4.1 Landing

- presents product marketing, governance positioning, and public content
- content is editable by admins from the Admin area

### 4.2 Authentication

- supports sign in and sign up
- users choose a preferred initial role from Viewer, Reviewer, or Creator at registration
- admin and approver access are assigned post-registration by administrators

### 4.3 Create

- allows creators to author prompt title and content
- supports ingestion from LLM
- supports ROI and benefit capture
- supports compliance validation and prompt analysis
- supports three primary outcomes:
  - save as Draft
  - save to Catalogue as Created
  - assign for Review directly as In Review

### 4.4 Validate

- shows governed review work queues
- supports department queue for unassigned Created assets
- supports reviewer queue for reviewer-owned review items
- supports approver queue for approver-owned approval items
- supports creator rework queue for returned prompts
- provides edit, comment, ROI adjustment, and decision actions

### 4.5 Catalogue

- shows approved prompts to authenticated users
- shows Created prompts to authenticated users
- shows Draft prompts only to their creator
- supports search, filters, version history, comments, execution logging, and copying to Create
- supports in-place editing of Draft and Created prompts by owner
- supports in-place Save to Catalogue for existing Draft and Created prompts
- supports in-place Assign for Review for existing Draft and Created prompts

### 4.6 Dashboard

- shows asset totals, department counts, workflow distribution, reuse, ROI, and other operational analytics
- visualizes the governed lifecycle using aggregated asset data

### 4.7 Admin

- manages user roles and suspension
- manages department assignments and manager assignments
- manages departments
- manages ROI formulas and weights
- manages landing page content
- views audit logs and governance activity

## 5. Prompt Lifecycle

The governed prompt lifecycle has four visible states:

- Draft
- Created
- In Review
- Approved

### 5.1 Draft

- entered when a creator saves an unfinished prompt
- visible in catalogue only to the creator
- editable only by the creator
- may transition to:
  - Created
  - In Review

### 5.2 Created

- entered when a creator completes validation and saves to catalogue
- visible in catalogue to authenticated users
- editable by the creator
- may transition to:
  - In Review

### 5.3 In Review

In Review contains three internal phases while remaining one visible state:

- reviewer_review
- creator_rework
- approver_review

#### reviewer_review

- owned by an assigned reviewer
- reviewer can edit, save progress, return to creator, or submit for approval

#### creator_rework

- entered when reviewer or approver sends the prompt back
- prompt remains In Review
- creator can edit the prompt and resubmit it to a reviewer

#### approver_review

- entered when reviewer submits for approval
- approver is the creator's manager with Approver, Admin, or Super Admin access
- approver can approve or return to creator

### 5.4 Approved

- entered when approver approves
- visible to authenticated users
- executable from catalogue

## 6. Workflow Transitions

Allowed transitions:

- Draft -> Created
- Draft -> In Review (reviewer_review)
- Created -> In Review (reviewer_review)
- In Review (reviewer_review) -> In Review (creator_rework)
- In Review (creator_rework) -> In Review (reviewer_review)
- In Review (reviewer_review) -> In Review (approver_review)
- In Review (approver_review) -> In Review (creator_rework)
- In Review (approver_review) -> Approved

Disallowed transitions include:

- direct creation of standalone Pending Approval state
- assignment of approver before reviewer submission
- approval by anyone except the assigned approver, admin, or super admin where policy allows

## 7. Visibility Rules

### 7.1 Draft

- creator only

### 7.2 Created

- all authenticated users in catalogue

### 7.3 In Review

- creator
- assigned reviewer
- assigned approver
- admin
- super admin

### 7.4 Approved

- all authenticated users

## 8. Review and Approval Routing

- reviewer assignment is limited to users in the same department with Reviewer, Admin, or Super Admin access
- approver assignment is manager-based
- creator manager must hold Approver, Admin, or Super Admin access
- approver must be in the same department as the creator unless overridden by admin behavior

## 9. Prompt Editing Rules

- creator can edit own Draft
- creator can edit own Created prompt
- creator can edit returned prompt during creator_rework phase
- reviewer can edit only during reviewer_review phase
- approver can edit only during approver_review phase
- approved prompts can be edited only according to owner/admin catalogue permissions and system policies

## 10. Governance and Audit

The system records:

- version snapshots
- lineage entries
- audit logs for lifecycle and admin actions
- prompt comments and discussion threads
- workflow decision history through audit entries and commit messages

## 11. Validation and Analysis

Prompt creation and review support:

- prompt quality scoring
- determinism and routing analysis
- security scanning
- compliance framework checks
- benefit and ROI capture

## 12. Analytics

Analytics surfaces:

- status counts across Draft, Created, In Review, and Approved
- department-level asset activity
- reuse and execution activity
- ROI category distributions
- workflow trend reporting

## 13. Administration

Admins can manage:

- user access and suspension
- department assignments
- manager relationships
- department master data
- ROI calculation configuration
- public landing content
- audit and governance reporting

## 14. Supabase Data Domains

Primary persisted entities include:

- profiles
- user_roles
- prompt_assets
- version_snapshots
- lineage_entries
- prompt_comments
- roi_facts
- audit_logs
- departments
- roi_configs
- landing_content

## 15. Non-Functional Expectations

- role-based access enforced in UI and database policies
- workflow transitions enforced by database trigger logic
- all user-facing lifecycle changes produce audit history
- catalogue and dashboard should remain responsive for standard operational volumes
- buildable React and TypeScript application with Supabase-backed persistence

## 16. Current Functional Baseline

As of March 28, 2026, the application baseline is:

- four visible lifecycle states
- in-place promotion for Draft and Created assets from Catalogue
- created assets visible across catalogue to authenticated users
- creator rework remains inside In Review
- reviewer and approver routing enforced by workflow trigger rules and visibility policies