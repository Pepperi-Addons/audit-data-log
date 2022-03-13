
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

export async function install(client: Client, request: Request): Promise<any> {
    const service = new MyService(client);
    await insertSubscription(client, service);
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
    const papiClient = service.papiClient;
    let addonUUID= "00000000-0000-0000-0000-00000da1a109";

    let relation:Relation={
        "RelationName": "UsageMonitor",
        "AddonUUID": addonUUID,
        "Name": "transactionsAndActivities",
        "Type": "AddonAPI",
        "AddonRelativeURL":"/api/transactions_and_activities_data"
    
    }
    const subscription = await service.papiClient.notification.subscriptions.find({ where: `Name='AuditDataLog'` });
    if (subscription.length === 0) {
        await insertSubscription(client, service);
    }
    try{
        await papiClient.addons.data.relations.upsert(relation);
    }
    catch(ex){
        console.log(`upsertRelation: ${ex}`);
        throw new Error((ex as {message:string}).message);
    }
    return { success: true, resultObject: {} }
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return { success: true, resultObject: {} }
}