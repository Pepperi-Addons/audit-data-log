
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { Relation, Subscription } from '@pepperi-addons/papi-sdk';
import DataRetrievalService from './data-retrieval.service';
import PermissionManager from './permission-manager.service';
import Semver from "semver";
import { RelationsService } from './relations.service';

export async function install(client: Client, request: Request): Promise<any> {
    const service = new DataRetrievalService(client);
    const permissionService = new PermissionManager(client);
    const relationService = new RelationsService(client);
    try{
        await relationService.createSettingsRelations();
        await relationService.createUsageMonitorRelations()
        await permissionService.upsertPermissions();
        await insertSubscription(client, service);
        
        return { success: true, resultObject: {} }
    } catch(error){
        return { success: false, errorMessage: error }
    }
}

async function insertSubscription(client: Client, service: DataRetrievalService) {
    let subscriptionBody: Subscription = {
        AddonRelativeURL: '/api/write_data_log_to_elastic_search',
        AddonUUID: client.AddonUUID,
        Name: 'AuditDataLog',
        Type: 'data',
        Key: 'AuditDataLog',
        FilterPolicy: {}
    };
    await service.papiClient.notification.subscriptions.upsert(subscriptionBody);
}

export async function uninstall(client: Client, request: Request): Promise<any> {
    const service = new DataRetrievalService(client);
    let subscriptionBody: Subscription = {
        AddonRelativeURL: '/api/write_data_log_to_elastic_search',
        AddonUUID: client.AddonUUID,
        Name: 'AuditDataLog',
        Type: 'data',
        Key: 'AuditDataLog',
        Hidden: true,
        FilterPolicy: {}
    };
    await service.papiClient.notification.subscriptions.upsert(subscriptionBody);
    return { success: true, resultObject: {} }
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    const service = new DataRetrievalService(client);
    const permissionService = new PermissionManager(client);
    const relationService = new RelationsService(client);
    try {
        const subscription = await service.papiClient.notification.subscriptions.find({ where: `Name='AuditDataLog'` });
        if (subscription.length === 0) {
            await insertSubscription(client, service);
        }
        
        if (Semver.lte(request.body.FromVersion, '1.0.0')) { // for versions below 1.1.0
            await relationService.createSettingsRelations();
        }

        if (Semver.lte(request.body.FromVersion, '1.1.61')) {
            await permissionService.upsertPermissions();
            await relationService.createUsageMonitorRelations();
        }
        return { success: true, resultObject: {} }

    } catch (error) {
        return { success: false, errorMessage: error }
    }
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return { success: true, resultObject: {} }
}
