import {assessDataExitEvidence} from './colzo-data-exit-coverage.js';
import {classifyTenantExit} from './colzo-tenant-export-classification.js';
export function makeInertDeletionReview({businessId,restoreVerified=false,approved=false,publicEvidence={},domainEvidence={},controlEvidence={},storageBytesVerified=false}={}){
 if(typeof businessId!=='string'|| !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(businessId))
 throw Error('Invalid fictional tenant');
 const evidence=assessDataExitEvidence({publicTables:publicEvidence,domains:domainEvidence,controls:controlEvidence});
 const scope=classifyTenantExit();
 return Object.freeze({business_id:businessId,executable:false,deletion_performed:false,action:'review_only',
 blockers:[...(!restoreVerified?['independent_compatible_restore_unverified']:[]),...(!approved?['destructive_authorisation_absent']:[]),
 ...(!storageBytesVerified?['actual_storage_bytes_unverified']:[]),'unreviewed_public_and_nonpublic_data','transactional_deletion_not_implemented',
 'auth_and_shared_user_preservation_not_rehearsed','legal_holds_and_audit_retention_not_approved'],
 unreviewed_public:[...new Set([...evidence.missingPublicTables,...scope.unaccounted])],
 missing_nonpublic:[...evidence.missingDomains],missing_controls:[...evidence.missingControls],
 forbidden_operations:Object.freeze(['DELETE','TRUNCATE','DROP','UPDATE','STORAGE_REMOVE','AUTH_DELETE','TOKEN_REVOKE']),
 note:'Review only; there is no SQL generator, database connection, credential revocation or delete operation.'});
}
