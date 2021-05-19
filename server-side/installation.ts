
/*
The return object format MUST contain the field 'success':
{success:true}

If the result of your code is 'false' then return:
{success:false, erroeMessage:{the reason why it is false}}
The error Message is importent! it will be written in the audit log and help the user to understand what happen
*/

import { Client, Request } from '@pepperi-addons/debug-server'
import { Subscription } from '@pepperi-addons/papi-sdk';
import MyService from './my.service';

export async function install(client: Client, request: Request): Promise<any> {
    const service = new MyService(client);
    let subscriptionBody: Subscription = {
        AddonRelativeURL: '/api/write_data_log_to_elastic_search',
        AddonUUID: client.AddonUUID,
        Name: 'AuditDateLog',
        Type: 'data',
        Key: 'AuditDataLog'
    };
    const res = await service.papiClient.notification.subscriptions.upsert(subscriptionBody);
    return { success: true, resultObject: {} }
}

export async function uninstall(client: Client, request: Request): Promise<any> {
    return { success: true, resultObject: {} }
}

export async function upgrade(client: Client, request: Request): Promise<any> {
    return { success: true, resultObject: {} }
}

export async function downgrade(client: Client, request: Request): Promise<any> {
    return { success: true, resultObject: {} }
}