
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { Relation, Subscription } from '@pepperi-addons/papi-sdk';
import MyService from './my.service';
import PermissionManager from './permission-manager.service';

const transactionActivitiesRelationName = "TransactionActivitiesRelation";
const computingTimeRelationName = "ComputingTime";


export async function install(client: Client, request: Request): Promise<any> {
    const service = new MyService(client);
    const permissionService = new PermissionManager(client);

    const papiClient = service.papiClient;
    await createUsageMonitorRelation(papiClient, client.AddonUUID)
    await insertSubscription(client, service);
    await permissionService.upsertPermissions();
    return { success: true, resultObject: {} }
}

async function insertSubscription(client: Client, service: MyService) {
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
    const service = new MyService(client);
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
    const service = new MyService(client);
    const permissionService = new PermissionManager(client);
    const papiClient = service.papiClient;
    await permissionService.upsertPermissions();

    let addonUUID= "00000000-0000-0000-0000-00000da1a109";
    const blockName = 'Audit_Data_Log';
    const filename = `file_${client.AddonUUID}`;

    const pageComponentRelation: Relation = {
        RelationName: 'AddonBlock',
        Name: blockName,
        Description: `${blockName} block`,
        Type: "NgComponent",
        SubType: "NG14",
        AddonUUID: client.AddonUUID,
        AddonRelativeURL: filename,
        ComponentName: `AuditDataLogBlockComponent`, // This is should be the block component name (from the client-side)
        ModuleName: `AuditDataLogBlockModule`, // This is should be the block module name (from the client-side)
        ElementsModule: 'WebComponents',
        ElementName: `block-element-${addonUUID}`,
    };

    await createNonExistingRelations(papiClient, client.AddonUUID);

    const blockNewName = 'AuditDataLog';

    const pageComponentRelationChangedName: Relation = {
        RelationName: 'AddonBlock',
        Name: blockNewName,
        Description: `${blockName} block`,
        Type: "NgComponent",
        SubType: "NG14",
        AddonUUID: client.AddonUUID,
        AddonRelativeURL: filename,
        ComponentName: `AuditDataLogBlockComponent`, // This is should be the block component name (from the client-side)
        ModuleName: `AuditDataLogBlockModule`, // This is should be the block module name (from the client-side)
        ElementsModule: 'WebComponents',
        ElementName: `block-element-${addonUUID}`,
    };

    const settingsRelation: Relation = {
        RelationName: "SettingsBlock",
        GroupName: 'Audit Data Log',
        SlugName: 'audit_data_log',
        Name: 'AuditDataLog',
        Description: 'Audit Data Log',
        Type: "NgComponent",
        SubType: "NG14",
        AddonUUID: addonUUID,
        AddonRelativeURL: filename,
        ComponentName: `AddonComponent`,
        ModuleName: `AddonModule`,
        ElementsModule: 'WebComponents',
        ElementName: `settings-element-${addonUUID}`,
    }


    const subscription = await service.papiClient.notification.subscriptions.find({ where: `Name='AuditDataLog'` });
    if (subscription.length === 0) {
        await insertSubscription(client, service);
    }
    try{
        await papiClient.addons.data.relations.upsert(pageComponentRelation);
        await papiClient.addons.data.relations.upsert(pageComponentRelationChangedName);

        await papiClient.addons.data.relations.upsert(settingsRelation);
    }
    catch(ex){
        console.log(`upsertRelation: ${ex}`);
        throw new Error((ex as {message:string}).message);
    }
    return { success: true, resultObject: {} }
}

async function createNonExistingRelations(papiClient, addonUUID){
    //If Usage Monitor relations doesn`t exist, create the relation
    const computingTimeRelationUrl = `/addons/data/relations?where=Name=${computingTimeRelationName}`;
    const activitiesRelationUrl = `/addons/data/relations?where=Name=${transactionActivitiesRelationName}`;

    let getComputingTimeRelationData = await papiClient.get(computingTimeRelationUrl);
    let getActivitiesRelationData = await papiClient.get(activitiesRelationUrl);

    if(getComputingTimeRelationData.length == 0){
        await upsertTransactionActivitiesRelation(papiClient, addonUUID);
    }

    if(getActivitiesRelationData.length == 0){
        await upsertComputingTimeRelation(papiClient, addonUUID);
    }
}

async function createUsageMonitorRelation(papiClient, addonUUID){
    await upsertTransactionActivitiesRelation(papiClient, addonUUID);
    await upsertComputingTimeRelation(papiClient, addonUUID);
}

async function upsertTransactionActivitiesRelation(papiClient, addonUUID){
    let transactionActivitiesRelation: Relation={
        "RelationName": "UsageMonitor",
        "AddonUUID": addonUUID,
        "Name": transactionActivitiesRelationName,
        "Type": "AddonAPI",
        "AddonRelativeURL":"/api/transactions_and_activities_data",
        "AggregationFunction": "SUM"
    }

    try{
        await papiClient.addons.data.relations.upsert(transactionActivitiesRelation);

    } catch(ex){
        console.log(`upsertComputingTimeRelation: ${ex}`);
        throw new Error("Error in upsertComputingTimeRelation: " + ex);
    }
}

async function upsertComputingTimeRelation(papiClient, addonUUID){
    let computingTimeRelation: Relation={
        "RelationName": "UsageMonitor",
        "AddonUUID": addonUUID,
        "Name": computingTimeRelationName,
        "Type": "AddonAPI",
        "AddonRelativeURL":"/api/get_functions_computing_time_from_elastic",
        "AggregationFunction": "SUM"
    }
    try{
        await papiClient.addons.data.relations.upsert(computingTimeRelation);

    } catch(ex){
        console.log(`upsertComputingTimeRelation: ${ex}`);
        throw new Error("Error in upsertComputingTimeRelation: " + ex);
    }
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return { success: true, resultObject: {} }
}