import MyService from './data-retrieval.service';
import { Client } from '@pepperi-addons/debug-server'
import { CreatedObject } from './createdObject';

export class ActivitiesCount {
    // 2.2 Get all ActionObject from AuditLog (only the specific fields needed) from all of the ActionUUIDList (do it with page by page of 100? each)
    // collect all ActionObjects in container called ActionObjectDictionary (key of ActionUUID of course)
    async getAuditLogData(client: Client, subActionUUIDList: string[], ActionObjectDictionary: Map<string, any>): Promise<void> {
        const service = new MyService(client);
        const papiClient = service.papiClient;
        let auditLogs: any[] = [];
        try {
            if (subActionUUIDList?.length) {
                let uuidstring = `/audit_logs?fields=UUID,AuditInfo.ResultObject&where=UUID IN (${subActionUUIDList})&AuditInfo.JobMessageData.AddonData.AddonUUID='00000000-0000-0000-0000-000000abcdef'`;
                auditLogs = await papiClient.get(`${uuidstring}`);
                auditLogs.forEach(auditLog => {
                    ActionObjectDictionary.set(auditLog.UUID, auditLog['AuditInfo.ResultObject']);
                });
            }
        }
        catch (ex) {
            console.log("Error:" + `${ex}`);
        }
    }

    // 2.3 scan CreatedObjects - for each CreatedObject check if its actionUUID exists in ActionObjectDictionary, if not, remove it from CreatedObjects
    // if exists, add DeviceType to CreatedObject
    addDeviceType(createdObjects, ActionObjectDictionary) {
        const deviceTypeMap = new Map([
            ['2', 'iPad'],
            ['5', 'Android'],
            ['9', 'iPhone'],
            ['10', 'Web']
        ]);

        return createdObjects.filter(createdObject => {
            let ret: boolean = false;
            if (ActionObjectDictionary.has(createdObject.ActionUUID)) {
                //Consider cloning the object instead of changing the given one
                let DeviceType = (ActionObjectDictionary.get(createdObject.ActionUUID)).match(/SourceType\":\"(\d+)/i)[1];
                let stringDeviceType = deviceTypeMap.get(DeviceType);
                createdObject.DeviceType = stringDeviceType;
                ret = true;
            }
            return ret;
        });
    }


    // 3.2 Get all UserObject from papi using the users/search with body (better users since there are more contacts) collect only UserUUID and add them all to UserUUIDDictionary (no need for pagination)
    async getAllUsers(client: Client, createdObjects: CreatedObject[], userUUIDList: string[]) {
        const service = new MyService(client);
        const papiClient = service.papiClient;
        let UserUUIDSet = new Set<string>();
        let UserObjects: any[] = [];
        let newCreatedObject: CreatedObject[] = [];

        let body = {
            "UUIDList": userUUIDList,
            "fields": "UUID,Profile"
        }
        let usersUrl = "/users/search";
        try {
            UserObjects = await papiClient.post(`${usersUrl}`, body);
            UserObjects.forEach(UserObject => {
                UserUUIDSet.add(UserObject['UUID']);
            });
        }
        catch (ex) {
            console.log("Error:" + `${ex}`);
        }

        newCreatedObject = this.addUserType(createdObjects, UserUUIDSet);
        return newCreatedObject;
    }

    // 3.3 scan CreatedObjects - for each CreatedObject check if its UserUUID exists in UserUUIDDictionary, if yes set UserType to "user" else "buyer"
    addUserType(createdObjects, UserUUIDSet) {
        return createdObjects.map(createdObject => {
            UserUUIDSet.has(createdObject.UserUUID) ? createdObject.UserType = "Users" : createdObject.UserType = "Buyers";
            return createdObject;
        })
    }

    // 4.2 Get all TransactionObject from papi using the transactions/search with body collect only UUID and add them all to ObjectKeyDictionary (no need for pagination)
    //Activity type can be transaction/activity/package
    async addActivityType(client: Client, createdObjects: CreatedObject[], ObjectKeyList: string[]) {
        const service = new MyService(client);
        const papiClient = service.papiClient;
        let transactionUUIDs = new Set<string>();
        let TransactionObjects: any[] = [];
        let newCreatedObject: CreatedObject[] = [];

        let body = {
            "UUIDList": ObjectKeyList,
            "fields": "UUID",
            "include_deleted": true
        }
        let transactionsUrl = "/transactions/search";
        try {
            TransactionObjects = await papiClient.post(`${transactionsUrl}`, body);
            TransactionObjects.forEach(TransactionObject => {
                transactionUUIDs.add(TransactionObject['UUID']);
            });
        }
        catch (ex) {
            console.log("Error:" + `${ex}`);
        }

        newCreatedObject = this.addType(createdObjects, transactionUUIDs);
        return newCreatedObject;
    }

    // 4.3 scan CreatedObjects - for each CreatedObject if type transactions, check if its UUID exists in ObjectKeyDictionary, if not set ActivityType to "packages" 
    addType(createdObjects, transactionUUIDs) {
        return createdObjects.map(createdObject => {
            if (createdObject.ActivityType == 'transactions') {
                transactionUUIDs.has(createdObject.ObjectKey) ? createdObject.ActivityType = "Transactions" : createdObject.ActivityType = "Pacakges";
            } else{
                createdObject.ActivityType = "Activities";
            }
            return createdObject;
        })
    }
}