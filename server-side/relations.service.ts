import { PapiClient, Relation } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import { AUDIT_LOG_BLOCK_NAME, MOD_AUDIT_LOG_BLOCK_NAME, COMPUTING_TIME_FUNCTION_NAME, TRANSACTIONS_ACTIVITIES_FUNCTION_NAME, FIELD_AUDIT_LOG_BLOCK_NAME, CODE_JOB_EXECUTIONS_BLOCK_NAME } from './entities';

export class RelationsService {

    papiClient: PapiClient;
    filename = `file_${this.client.AddonUUID}`;

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });
    }

    private async upsertRelation(relation: Relation): Promise<any> {
        try {
            console.log(`upserting relation: ${relation.Name}`);
            await this.papiClient.addons.data.relations.upsert(relation);
            console.log(`upserted relation: ${relation.Name}`);
        } catch (error) {
            console.error(`error upserting relation: ${error}`);
            throw new Error("error upserting relation: " + error);
        }
    }

    private async createRelations(relations: Relation[]): Promise<any> {
        await Promise.all(relations.map(async relation => {
            await this.upsertRelation(relation)
        }));
    }

    async createSettingsRelations() {
        await this.createRelations([
            {
                RelationName: "SettingsBlock",
                GroupName: 'Audit Data Log',
                SlugName: 'audit_data_log',
                Name: 'AuditDataLog',
                Description: 'Audit Data Log',
                Type: "NgComponent",
                SubType: "NG14",
                AddonUUID: this.client.AddonUUID,
                AddonRelativeURL: this.filename,
                ComponentName: `AddonComponent`,
                ModuleName: `AddonModule`,
                ElementsModule: 'WebComponents',
                ElementName: `settings-element-${this.client.AddonUUID}`,
            },
            {
                RelationName: 'AddonBlock',
                Name: AUDIT_LOG_BLOCK_NAME,
                Description: `${AUDIT_LOG_BLOCK_NAME} block`,
                Type: "NgComponent",
                SubType: "NG14",
                AddonUUID: this.client.AddonUUID,
                AddonRelativeURL: this.filename,
                ComponentName: `AuditDataLogBlockComponent`, // This is should be the block component name (from the client-side)
                ModuleName: `AuditDataLogBlockModule`, // This is should be the block module name (from the client-side)
                ElementsModule: 'WebComponents',
                ElementName: `block-element-${this.client.AddonUUID}`,
            },
            {
                RelationName: 'AddonBlock',
                Name: MOD_AUDIT_LOG_BLOCK_NAME,
                Description: `${MOD_AUDIT_LOG_BLOCK_NAME} block`,
                Type: "NgComponent",
                SubType: "NG14",
                AddonUUID: this.client.AddonUUID,
                AddonRelativeURL: this.filename,
                ComponentName: `AuditDataLogBlockComponent`, // This is should be the block component name (from the client-side)
                ModuleName: `AuditDataLogBlockModule`, // This is should be the block module name (from the client-side)
                ElementsModule: 'WebComponents',
                ElementName: `block-element-${this.client.AddonUUID}`,
            },
            {
                RelationName: 'AddonBlock',
                Name: CODE_JOB_EXECUTIONS_BLOCK_NAME,
                Description: `${CODE_JOB_EXECUTIONS_BLOCK_NAME} block`,
                Type: "NgComponent",
                SubType: "NG14",
                AddonUUID: this.client.AddonUUID,
                AddonRelativeURL: this.filename,
                ComponentName: `AsyncJobsBlockComponent`, // This is should be the block component name (from the client-side)
                ModuleName: `AsyncJobsBlockModule`, // This is should be the block module name (from the client-side)
                ElementsModule: 'WebComponents',
                ElementName: `async-jobs-block-element-${this.client.AddonUUID}`,
            },
            {
                RelationName: 'AddonBlock',
                Name: FIELD_AUDIT_LOG_BLOCK_NAME,
                Description: `${FIELD_AUDIT_LOG_BLOCK_NAME} block`,
                Type: "NgComponent",
                SubType: "NG14",
                AddonUUID: this.client.AddonUUID,
                AddonRelativeURL: this.filename,
                ComponentName: `AuditDataFieldLogBlockComponent`, // This is should be the block component name (from the client-side)
                ModuleName: `AuditDataFieldLogBlockModule`, // This is should be the block module name (from the client-side)
                ElementsModule: 'WebComponents',
                ElementName: `audit-data-field-log-block-element-${this.client.AddonUUID}`,
            }
        ]);
    }

    async createUsageMonitorRelations() {
        await this.createRelations([
            {
                RelationName: "UsageMonitor",
                AddonUUID: this.client.AddonUUID,
                Name: TRANSACTIONS_ACTIVITIES_FUNCTION_NAME,
                Type: "AddonAPI",
                AddonRelativeURL: `/api/${TRANSACTIONS_ACTIVITIES_FUNCTION_NAME}`,
                AggregationFunction: "SUM",
                Async: true
            },
            {
                RelationName: "UsageMonitor",
                AddonUUID: this.client.AddonUUID,
                Name: COMPUTING_TIME_FUNCTION_NAME,
                Type: "AddonAPI",
                AddonRelativeURL: `/api/${COMPUTING_TIME_FUNCTION_NAME}`,
                AggregationFunction: "SUM"
            }
        ]);
    }
}