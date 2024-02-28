import MyService from './data-retrieval.service';
import { CreatedObject } from './createdObject';
import peach from 'parallel-each';
import { ActivitiesCount } from './activitiesCount';

const activitiesCount = new ActivitiesCount();

export class CPAPIUsage{
    m_papiClient;
    m_cpapiCreatedObjects: CreatedObject[];
    createdObjectMap: Map<string, number>;

    constructor(client){
        this.m_papiClient = client;
        this.m_cpapiCreatedObjects = [];
        this.createdObjectMap = new Map([]);
        this.buildTypeMap();        
    }

    //Creats the data sets of all UserType-ActivyType-Device combinations
    buildTypeMap(){
        let typeMap: string[][] = [['Users', 'Buyers'], ['Activities', 'Transactions', 'Packages'], ['Android', 'iPad', 'iPhone', 'Web']];
        let loopOver = (arr, str = '') => arr[0].map(v => arr.length > 1 ? loopOver(arr.slice(1), str + " " + v) : str + " " + v).flat();
        let allCombinations = loopOver(typeMap);

        allCombinations.forEach(element => {
            element = element.trim();
            this.createdObjectMap.set(element, 0);
        });
    }

    public async calculateLastDayUsage(){
        await this.initiateCPAPICreatedObjects("transactions");
        await this.initiateCPAPICreatedObjects("activities");
        await this.addDeviceTypeToCreatedObjects(); 
        await this.addUserTypeToCreatedObjects();
        await this.addActivityTypeToCreatedObjects();

        return this.createObjectsMapping();
    }
    
    //perform count by Device+ActivityType+UserType
    createObjectsMapping(){
        this.m_cpapiCreatedObjects.forEach(createdObject => {
            if(createdObject['UserType'] && createdObject['ActivityType'] && createdObject['DeviceType']){
                let createdObjectString = `${createdObject['UserType']} ${createdObject['ActivityType']} ${createdObject['DeviceType']}`;
                let getCreatedObjectValue = this.createdObjectMap.get(createdObjectString);
                if(getCreatedObjectValue){
                    this.createdObjectMap.set(createdObjectString, getCreatedObjectValue + 1);
                } else{
                    this.createdObjectMap.set(createdObjectString, 1);
                }
            }    
        });
       
        return this.createdObjectMap;
    }

    // 1. get all created objects from Audit Data Logs
    // after this phase the CreatedObject will have the following fields: ObjectKey, ActionUUID, UserUUID, and ActivityType (partial - missing packages)
    async initiateCPAPICreatedObjects(activityType: string) {   
        const service = new MyService(this.m_papiClient);
        const papiClient = service.papiClient;

        const startTime: Date = new Date(new Date().setDate((new Date()).getDate() -1));
        const endTime: Date = new Date(new Date().setDate((new Date()).getDate() -1));

        startTime.setUTCHours(0,0,0);
        endTime.setUTCHours(23,59,59);

        let dateCheck: string = "CreationDateTime>=" + startTime.toISOString() + " and CreationDateTime<=" + endTime.toISOString();
        let params: string = `where=AddonUUID.keyword=00000000-0000-0000-0000-00000000c07e and ActionType=insert and Resource=${activityType} and ${dateCheck}&fields=ActionUUID,ObjectKey,UserUUID,Resource`;
        
        const dataLogUUID: string = this.m_papiClient.AddonUUID;
        const dataLogUrl: string = `${dataLogUUID}/${'api'}/${'audit_data_logs'+'?'+ params}`;
        const dataLogResult = await papiClient.get(`/addons/api/${dataLogUrl}`);
        
        const createdObjects: CreatedObject[] = dataLogResult.map((element:CreatedObject) => {
            return new CreatedObject(element.ActionUUID, element.ObjectKey, element.UserUUID, activityType)
        });

        this.m_cpapiCreatedObjects.push(...createdObjects);
    }

    // 2. compute DeviceType from ActionUUD based on cpapi AddonUUID (ABCDEF)
    // 2.1 scan all CreatedObjects and collect ActionUUIDs - collect then in conatiner called ActionUUIDList
    // 2.2 Get all ActionObject from AuditLog (only the specific fields needed) from all of the ActionUUIDList (do it with page by page of 100? each)
    // collect all ActionObjects in container called ActionObjectDictionary (key of ActionUUID of course) 
    // 2.3 scan CreatedObjects - for each CreatedObject check if its actionUUID exists in ActionObjectDictionary, if not, remove it from CreatedObjects
    // if exists, add DeviceType to CreatedObject
    // after this phase the CreatedObject will have the following fields: ObjectKey, ActionUUID, UserUUID, DeviceType
    async addDeviceTypeToCreatedObjects (){
        let allElements: any[][]= [];
        let ActionObjectDictionary = new Map<string,any>();
        let newCreatedObject: CreatedObject[] = [];
        let actionUUIDList: string[] = this.m_cpapiCreatedObjects.map(element => "'" + element.ActionUUID + "'");

        //splitting actionUUIDList to sub arrays of 100 action UUIDs each
        for(let index=0; index < actionUUIDList.length; index+=100){
            let newArrayUUID= actionUUIDList.slice(index,index+100);
            allElements.push(newArrayUUID);
        }

        try{
                await peach(allElements, async(subActionUUIDList, i)=>{
                    await activitiesCount.getAuditLogData(this.m_papiClient, subActionUUIDList, ActionObjectDictionary)
                }, 15);
        }

        catch(ex){
            console.log("Error:"+`${ex}`);
        }

        newCreatedObject= activitiesCount.addDeviceType(this.m_cpapiCreatedObjects, ActionObjectDictionary);
        this.m_cpapiCreatedObjects = newCreatedObject;
    }

    // 3. compute UserType from UserUUID based on papi 
    // 3.1 scan all CreatedObjects and collect UserUUIDs - collect then in conatiner called UserUUIDList   
    // 3.2 Get all UserObject from papi using the users/search with body (better users since there are more contacts) collect only UserUUID and add them all to UserUUIDDictionary (no need for pagination)
    // 3.3 scan CreatedObjects - for each CreatedObject check if its UserUUID exists in UserUUIDDictionary, if yes set UserType to "user" else "buyer"
    // after this phase the CreatedObject will have the following fields: ObjectKey, ActionUUID, UserUUID, DeviceType, UserType
    async addUserTypeToCreatedObjects () {
        let newCreatedObject: CreatedObject[] = [];
        let userUUIDList: string[] = this.m_cpapiCreatedObjects.map(element => element.UserUUID)
        newCreatedObject= await activitiesCount.getAllUsers(this.m_papiClient, this.m_cpapiCreatedObjects, userUUIDList);
        this.m_cpapiCreatedObjects = newCreatedObject;
    }

    // 4. recompute ActivityType of transactions to either transactions or packages from ObjectKey based on papi
    // 4.1 scan all CreatedObjects and collect all ObjectKeys of type "transactions" - collect then in conatiner called ObjectKeyList
    // 4.2 Get all TransactionObject from papi using the transactions/search with body collect only UUID and add them all to ObjectKeyDictionary (no need for pagination)
    // 4.3 scan CreatedObjects - for each CreatedObject if type transactions, check if its UUID exists in ObjectKeyDictionary, if not set ActivityType to "packages" 
    // after this phase the CreatedObject will have the following fields: ObjectKey, ActionUUID, UserUUID, DeviceType, UserType, ActivityType
    async addActivityTypeToCreatedObjects () {
        let newCreatedObject: CreatedObject[] = [];

        let ObjectKeyList: string[] = [];
        this.m_cpapiCreatedObjects.forEach(element => {
            if(element['ActivityType'] == 'transactions'){
                ObjectKeyList.push(element['ObjectKey'])
            }
        });
        newCreatedObject= await activitiesCount.addActivityType(this.m_papiClient, this.m_cpapiCreatedObjects, ObjectKeyList);
        this.m_cpapiCreatedObjects = newCreatedObject;
    }
}