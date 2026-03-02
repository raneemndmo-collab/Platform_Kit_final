-- Rasid Platform v6.4 — Complete Database Initialization
-- Auto-generated: 2026-03-01
-- Total: 62 isolated databases

-- Kernel Databases
CREATE DATABASE rasid_k1_auth; CREATE USER k1_user WITH PASSWORD 'k1_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k1_auth TO k1_user;
CREATE DATABASE rasid_k2_authz; CREATE USER k2_user WITH PASSWORD 'k2_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k2_authz TO k2_user;
CREATE DATABASE rasid_k3_audit; CREATE USER k3_user WITH PASSWORD 'k3_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k3_audit TO k3_user;
CREATE DATABASE rasid_k4_config; CREATE USER k4_user WITH PASSWORD 'k4_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k4_config TO k4_user;
CREATE DATABASE rasid_k5_events; CREATE USER k5_user WITH PASSWORD 'k5_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k5_events TO k5_user;
CREATE DATABASE rasid_k6_notification; CREATE USER k6_user WITH PASSWORD 'k6_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k6_notification TO k6_user;
CREATE DATABASE rasid_k7_tasks; CREATE USER k7_user WITH PASSWORD 'k7_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k7_tasks TO k7_user;
CREATE DATABASE rasid_k8_governance; CREATE USER k8_user WITH PASSWORD 'k8_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k8_governance TO k8_user;
CREATE DATABASE rasid_k9_monitoring; CREATE USER k9_user WITH PASSWORD 'k9_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k9_monitoring TO k9_user;
CREATE DATABASE rasid_k10_lifecycle; CREATE USER k10_user WITH PASSWORD 'k10_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rasid_k10_lifecycle TO k10_user;

-- Phase 1: Core Business
CREATE DATABASE hrm_db; CREATE USER hrm_user WITH PASSWORD 'hrm_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE hrm_db TO hrm_user;
CREATE DATABASE finance_db; CREATE USER finance_user WITH PASSWORD 'finance_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE finance_db TO finance_user;
CREATE DATABASE crm_db; CREATE USER crm_user WITH PASSWORD 'crm_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
CREATE DATABASE inventory_db; CREATE USER inventory_user WITH PASSWORD 'inventory_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;
CREATE DATABASE procurement_db; CREATE USER procurement_user WITH PASSWORD 'procurement_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE procurement_db TO procurement_user;
CREATE DATABASE gateway_db; CREATE USER gateway_user WITH PASSWORD 'gateway_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE gateway_db TO gateway_user;

-- Phase 2: Extended Business + Workflow
CREATE DATABASE project_db; CREATE USER project_user WITH PASSWORD 'project_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE project_db TO project_user;
CREATE DATABASE document_db; CREATE USER document_user WITH PASSWORD 'document_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE document_db TO document_user;
CREATE DATABASE workflow_db; CREATE USER workflow_user WITH PASSWORD 'workflow_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE workflow_db TO workflow_user;
CREATE DATABASE compliance_db; CREATE USER compliance_user WITH PASSWORD 'compliance_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE compliance_db TO compliance_user;
CREATE DATABASE legal_db; CREATE USER legal_user WITH PASSWORD 'legal_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE legal_db TO legal_user;
CREATE DATABASE storage_db; CREATE USER storage_user WITH PASSWORD 'storage_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE storage_db TO storage_user;
CREATE DATABASE scheduler_db; CREATE USER scheduler_user WITH PASSWORD 'scheduler_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE scheduler_db TO scheduler_user;

-- Phase 3: Intelligence + Analytics
CREATE DATABASE ai_db; CREATE USER ai_user WITH PASSWORD 'ai_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE ai_db TO ai_user;
CREATE DATABASE analytics_db; CREATE USER analytics_user WITH PASSWORD 'analytics_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE analytics_db TO analytics_user;
CREATE DATABASE reporting_db; CREATE USER reporting_user WITH PASSWORD 'reporting_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE reporting_db TO reporting_user;
CREATE DATABASE decision_db; CREATE USER decision_user WITH PASSWORD 'decision_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE decision_db TO decision_user;
CREATE DATABASE kg_db; CREATE USER kg_user WITH PASSWORD 'kg_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE kg_db TO kg_user;
CREATE DATABASE nlp_db; CREATE USER nlp_user WITH PASSWORD 'nlp_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE nlp_db TO nlp_user;
CREATE DATABASE vision_db; CREATE USER vision_user WITH PASSWORD 'vision_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE vision_db TO vision_user;

-- Phase 4: Experience + Integration
CREATE DATABASE dashboard_db; CREATE USER dashboard_user WITH PASSWORD 'dashboard_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE dashboard_db TO dashboard_user;
CREATE DATABASE portal_db; CREATE USER portal_user WITH PASSWORD 'portal_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE portal_db TO portal_user;
CREATE DATABASE notif_center_db; CREATE USER notif_user WITH PASSWORD 'notif_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE notif_center_db TO notif_user;
CREATE DATABASE search_db; CREATE USER search_user WITH PASSWORD 'search_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE search_db TO search_user;
CREATE DATABASE personal_db; CREATE USER personal_user WITH PASSWORD 'personal_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE personal_db TO personal_user;
CREATE DATABASE collab_db; CREATE USER collab_user WITH PASSWORD 'collab_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE collab_db TO collab_user;
CREATE DATABASE integration_db; CREATE USER integration_user WITH PASSWORD 'integration_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE integration_db TO integration_user;

-- Phase 5: Hardening + Production Readiness
CREATE DATABASE audit_trail_db; CREATE USER audit_user WITH PASSWORD 'audit_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE audit_trail_db TO audit_user;
CREATE DATABASE tenant_db; CREATE USER tenant_user WITH PASSWORD 'tenant_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE tenant_db TO tenant_user;
CREATE DATABASE billing_db; CREATE USER billing_user WITH PASSWORD 'billing_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE billing_db TO billing_user;
CREATE DATABASE devportal_db; CREATE USER devportal_user WITH PASSWORD 'devportal_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE devportal_db TO devportal_user;

-- Tier X: Document Processing Cluster
CREATE DATABASE cdr_db; CREATE USER cdr_user WITH PASSWORD 'cdr_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE cdr_db TO cdr_user;
CREATE DATABASE layout_db; CREATE USER layout_user WITH PASSWORD 'layout_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE layout_db TO layout_user;
CREATE DATABASE visual_db; CREATE USER visual_user WITH PASSWORD 'visual_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE visual_db TO visual_user;
CREATE DATABASE convert_db; CREATE USER convert_user WITH PASSWORD 'convert_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE convert_db TO convert_user;
CREATE DATABASE render_db; CREATE USER render_user WITH PASSWORD 'render_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE render_db TO render_user;
CREATE DATABASE media_db; CREATE USER media_user WITH PASSWORD 'media_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE media_db TO media_user;
CREATE DATABASE interact_db; CREATE USER interact_user WITH PASSWORD 'interact_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE interact_db TO interact_user;
CREATE DATABASE typo_db; CREATE USER typo_user WITH PASSWORD 'typo_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE typo_db TO typo_user;
CREATE DATABASE brand_db; CREATE USER brand_user WITH PASSWORD 'brand_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE brand_db TO brand_user;
CREATE DATABASE trans_db; CREATE USER trans_user WITH PASSWORD 'trans_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE trans_db TO trans_user;
CREATE DATABASE constraint_db; CREATE USER constraint_user WITH PASSWORD 'constraint_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE constraint_db TO constraint_user;
CREATE DATABASE rebind_db; CREATE USER rebind_user WITH PASSWORD 'rebind_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE rebind_db TO rebind_user;
CREATE DATABASE drift_db; CREATE USER drift_user WITH PASSWORD 'drift_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE drift_db TO drift_user;

-- v6.4 Enhanced AI Modules
CREATE DATABASE apil_orchestrator_db; CREATE USER apil_user WITH PASSWORD 'apil_user_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE apil_orchestrator_db TO apil_user;
CREATE DATABASE arabic_ai_engine_db; CREATE USER arabic_ai_user WITH PASSWORD 'arabic_ai_user_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE arabic_ai_engine_db TO arabic_ai_user;
CREATE DATABASE bi_cognitive_db; CREATE USER bi_cognitive_user WITH PASSWORD 'bi_cognitive_user_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE bi_cognitive_db TO bi_cognitive_user;
CREATE DATABASE data_intelligence_db; CREATE USER data_intelligence_user WITH PASSWORD 'data_intelligence_user_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE data_intelligence_db TO data_intelligence_user;
CREATE DATABASE data_safety_db; CREATE USER data_safety_user WITH PASSWORD 'data_safety_user_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE data_safety_db TO data_safety_user;
CREATE DATABASE infographic_engine_db; CREATE USER infographic_user WITH PASSWORD 'infographic_user_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE infographic_engine_db TO infographic_user;
CREATE DATABASE performance_intelligence_db; CREATE USER performance_user WITH PASSWORD 'performance_user_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE performance_intelligence_db TO performance_user;
CREATE DATABASE spreadsheet_intelligence_db; CREATE USER spreadsheet_user WITH PASSWORD 'spreadsheet_user_secure_pwd'; GRANT ALL PRIVILEGES ON DATABASE spreadsheet_intelligence_db TO spreadsheet_user;
