import MyService from './my.service'
import { Client, Request } from '@pepperi-addons/debug-server'
import { Document, UpdatedField } from "../shared/models/document"
import { Constants } from "../shared/constants"
import { v4 as uuid } from 'uuid';
import * as os from 'os';
import jwtDecode from 'jwt-decode';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import QueryUtil from '../shared/utilities/query-util'

import peach from 'parallel-each';


//get all of the combinations of resource-user-device and counts them.
export async function transactions_and_activity_data(client:Client, request:Request){
    let type_user_Count:Map<string, number>= new Map([        
        ['Users transactions - Android', 0],
        ['Users transactions - iPad', 0],
        ['Users transactions - iPhone', 0],
        ['Users transactions - Web', 0],
        ['Buyers transactions - Android', 0],
        ['Buyers transactions - iPad', 0],
        ['Buyers transactions - iPhone', 0],
        ['Buyers transactions - Web', 0],

        ['Users activities - Android', 0],
        ['Users activities - iPad', 0],
        ['Users activities - iPhone', 0],
        ['Users activities - Web', 0],
        ['Buyers activities - Android', 0],
        ['Buyers activities - iPad', 0],
        ['Buyers activities - iPhone', 0],
        ['Buyers activities - Web', 0]
    ]);

    
    await getResource(client, request, type_user_Count, "transactions");
    await getResource(client, request, type_user_Count, "activities");


    try{
        let Resource:any[]= [];
        for(let key of type_user_Count.keys() ){
            let description:string= `${key.split(' ')[1]} created by ${key.split(' ')[0]} in the last 7 days - ${key.split(' ')[3]}`;
            let value= type_user_Count.get(key);
            let resource={
            Data:  `${key}`,
            Description: description,
            Size: value
        };
        Resource.push(resource);
        }
        
        let returnObject={
            "Title": "Usage",
            "Resources": Resource
        }
        return returnObject;

    }
    catch(ex){
        console.log(`Error: ${ex}`);
        throw new Error((ex as Error).message);

        
    }
    
}


//Create an array of activities UUIDs or transactions UUIDs.
async function GetActivitiesAndTranstactionsAuditDataLogs(client:Client, request:Request, resource:string):Promise<any[]> {
    
    //search for a span of a week
    let dateNow:Date= new Date();
    let DateNowString= dateNow.toISOString();
    dateNow.setDate(dateNow.getDate() -7);
    const LastWeekDateString = dateNow.toISOString();
    let dateCheck: string= "CreationDateTime>="+ LastWeekDateString+" and CreationDateTime<="+ DateNowString;
    let Params: string= `AddonUUID.keyword=00000000-0000-0000-0000-00000000c07e and ActionType=insert and Resource=${resource} and ${dateCheck}`;
    request.query.where= `${Params}`;
    request.query.fields= "ActionUUID";

    const Result= await audit_data_logs(client, request);
    return Result;
}

//Create UUIDs array, send every 100 UUIDs taken from the array to extractData function.
async function getResource(client:Client,request:Request, counts:Map<string, number>, resource:string){
        let result = await GetActivitiesAndTranstactionsAuditDataLogs(client, request, resource);

        //creating a list of UUIDs taken from audit data logs
        let allActivitiesUUIDsArray:any[]= [];
        if(result!= undefined && result.length!= 0 ){
            result.forEach(resObj=>{allActivitiesUUIDsArray.push("'"+resObj.ActionUUID+"'")});
        }

        let allElements: any[][]= [];
        for(let index=0; index<allActivitiesUUIDsArray .length;index+=100){
            let newArrayUUID= allActivitiesUUIDsArray.slice(index,index+100);
            allElements.push(newArrayUUID);

        }

        try{
                await peach(allElements, async(SubAllActivitiesUUIDsArray, i)=>{
                    await extractData(client, counts, SubAllActivitiesUUIDsArray, resource)
                }, 15);
        }

        catch(ex){
            console.log("Error:"+`${ex}`);

        }
}

//Search for UUIDs in audit logs- if it contains the UUID, increase the suitable place in the dictionary by one.
async function extractData(client:Client, counts:Map<string, number>, SubAllActivitiesUUIDsArray, resource:string){
    let typeMap= new Map([
        ['2', 'iPad'],
        ['5', 'android'],
        ['7', 'iPhone'],
        ['10', 'Web']
    ]);

    try{
        const service = new MyService(client);
        const papiClient = service.papiClient;
        let auditLogs:any[]= [];
        if(SubAllActivitiesUUIDsArray!= undefined && SubAllActivitiesUUIDsArray.length!= 0 && SubAllActivitiesUUIDsArray[0]!= ''){
            let uuidstring= `/audit_logs?where=UUID IN (${SubAllActivitiesUUIDsArray})&AuditInfo.JobMessageData.AddonData.AddonUUID='00000000-0000-0000-0000-000000abcdef'`;
            auditLogs=  await papiClient.get(`${uuidstring}`);
    
            //if audit Logs array is empty, there are no shared users between audit logs and audit data logs in the specific array.
            //else- extract which user type the user is and which resource did he use, and insert the result to the dictionary.
            if(auditLogs!= undefined && auditLogs.length!= 0 ) {
                for(let index= 0; index<auditLogs.length; index++){
                    const ResultObject= await auditLogs[index]['AuditInfo']['ResultObject'];
                    const userUUID:string= await auditLogs[index]["AuditInfo"]["JobMessageData"]["UserUUID"];
                    const urlParam: string= "where=UUID='"+userUUID+"'";
                    const contactsURL:string = `/contacts?${urlParam}`;
    
                    let contactsResult:any= await papiClient.get(`${contactsURL}`);
    
                    if((contactsResult!=undefined) && (contactsResult.length!=0)){
                        if(contactsResult[0]['IsBuyer']==true){
                            insertToDictionary(ResultObject, counts, typeMap, resource, 'Buyers');
                        }
                    }    
                    else{
                        const usersURL:string = `/users?${urlParam}`;
                        let usersResult:any= await papiClient.get(`${usersURL}`);
                        if( (usersResult!=undefined) && (usersResult.length!=0)){
                            let userType:string= await usersResult[0]['Profile']['Data']['Name'];
                            if((userType.toLowerCase()=='rep' || userType.toLowerCase()=='admin'))
                            {
                                insertToDictionary(ResultObject, counts, typeMap, resource, "Users");
                            } 
                        }
                    }
                }
            }
        }
        
    }
    catch(ex){
        console.log("error extract data"+`${ex}`);
    }
}

function insertToDictionary(ResultObject, counts, typeMap, resource:string, userType:string){
    const SourceType: string= ResultObject.match(/SourceType\":\"(\d+)/i)[1];
    let stringSource= typeMap.get(SourceType);

    let dictionaryString:string= `${userType}`+' '+`${resource}`+' - '+`${stringSource}`;
                    
    (userType)? (counts.set(dictionaryString, counts.get(dictionaryString)+1)) : undefined;

}


export async function write_data_log_to_elastic_search(client: Client, request: Request) {
    

    const distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
    console.log("start write data log to elastic search");
    const service = new MyService(client);
    let body = request.body;

    const dateString = new Date().toISOString();
    let bulkBody = new Array();

    for (const object of body.Message.ModifiedObjects) {

        if (object[`ModifiedFields`]) {
            for (const modifiedField of object[`ModifiedFields`]) {
                if (typeof modifiedField.NewValue === 'object') {
                    modifiedField.NewValue = JSON.stringify(modifiedField.NewValue);
                }
                if (typeof modifiedField.OldValue === 'object') {
                    modifiedField.OldValue = JSON.stringify(modifiedField.OldValue);
                }
            }
        }

        const doc: Document = {
            ActionUUID: body.Message.ActionUUID,
            AddonUUID: body.FilterAttributes.AddonUUID,
            ObjectKey: object.ObjectKey,
            DistributorUUID: distributorUUID,
            ObjectModificationDateTime: object.ObjectModificationDateTime,
            CreationDateTime: dateString,
            UserUUID: body.FilterAttributes.UserUUID,
            ActionType: body.FilterAttributes.Action,
            Resource: body.FilterAttributes.Resource,
            UpdatedFields: <UpdatedField[]>object[`ModifiedFields`]
        }

        bulkBody.push({ "index": { "_index": Constants.AUDIT_DATA_LOG_INDEX, "_type": "_doc" } });
        bulkBody.push(doc);
    }


    let bulkBodyNDJSON = "";

    for (const line of bulkBody) {
        bulkBodyNDJSON = bulkBodyNDJSON + JSON.stringify(line) + os.EOL;
    };
    const response = await service.papiClient.post("/addons/api/" + client.AddonUUID + "/api/post_to_elastic_search", bulkBodyNDJSON);

    console.log(`finish write data log to elastic search`);

};

export async function post_to_elastic_search(client: Client, request: Request) {

    const body = request.body;
    const endpoint = `/${Constants.AUDIT_DATA_LOG_INDEX}/_bulk`
    const method = 'POST';

    const response = await callElasticSearchLambda(endpoint, method, body, "application/x-ndjson");

    if (!response.success) {
        throw new Error(response["errorMessage"]);
    }

    if (response.resultObject.error) {
        throw new Error(response.resultObject.error.reason + ". " + response.resultObject.error.details);
    }
}

export async function audit_data_logs(client: Client, request: Request) {

    try {

        const distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
        const include_count = request.query.include_count ? request.query.include_count : false;
        const fields = request.query.fields ? request.query.fields.replace(" ", "").split(",") : undefined;
        const page = request.query.page ? (request.query.page > 0 ? request.query.page - 1 : 0) : 0;
        let page_size = request.query.page_size ? request.query.page_size : 10000;
        if (page_size == -1) {
            page_size = 10000;
        }
        else if (page_size > 10000) {
            page_size = 10000;
        }
        const from = page * page_size;
        let where: string[] = request.query.where ? request.query.where.split(" and ") : [];
        where.push(`DistributorUUID=${distributorUUID}`);
        const search_string = request.query.search_string;
        const search_string_fields = request.query.search_string_fields ? request.query.search_string_fields.replace(" ", "").split(",") : undefined;
        const order_by = request.query.order_by ? request.query.order_by.split(" ") : undefined;

        const body = {
            "size": page_size,
            "from": from,
            "track_total_hits": include_count,
            "query": {
                "bool": {
                    "must": new Array()
                }
            }
        };
        if (search_string) {
            if (search_string_fields) {
                body["query"]["bool"]["must"].push({ "query_string": { "query": "*" + search_string + "*", "fields": search_string_fields, "type": "most_fields", "minimum_should_match": 2 } });
            }
            else {
                body["query"]["bool"]["must"].push({ "query_string": { "query": "*" + search_string + "*", "type": "most_fields", "minimum_should_match": 2 } });
            }
        }


        QueryUtil.convertParamsToQuery(fields, where, order_by, body);

        // call ElasticSearchLambda directly
        const endpoint = `${Constants.AUDIT_DATA_LOG_INDEX}/_search`;
        const method = 'POST';
        const lambdaResponse = await callElasticSearchLambda(endpoint, method, JSON.stringify(body), null, true);
        let response;
        if (lambdaResponse.success) {
            response = lambdaResponse.resultObject;
        }
        else {
            throw new Error(lambdaResponse["errorMessage"]);
        }

        if (response.error) {
            if (response.error.caused_by) {
                throw new Error(response.error.caused_by.reason);
            }
            else {
                throw new Error(response.error.type + ". " + response.error.reason);
            }
        }

        if (response.errorType) {
            if (response.errorMessage) {
                throw new Error(response.errorMessage);
            }
        }

        let result = {};
        if (include_count == "true") {
            const count = response.hits.total.value;
            result["TotalCount"] = count;
        }

        let docs = new Array();
        response.hits.hits.forEach(item => {
            docs.push(item._source);
        });


        return docs;
    }
    
    catch (e) {
        console.log(`error in audit_data_log: ${(e as Error).message}`);
        throw new Error((e as Error).message);
    }
    
};

export async function filters(client: Client, request: Request) {

    try {

        const distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
        const distinct_fields = request.query.distinct_fields ? request.query.distinct_fields.replace(" ", "").split(",") : undefined;
        const where = request.query.where ? request.query.where.split(" and ") : [];
        where.push(`DistributorUUID=${distributorUUID}`);

        const search_string = request.query.search_string;
        const search_string_fields = request.query.search_string_fields ? request.query.search_string_fields.replace(" ", "").split(",") : undefined;

        const endpoint = `${Constants.AUDIT_DATA_LOG_INDEX}/_search`;
        const method = 'POST';

        if (!distinct_fields) {
            return new Array();
        }

        const body = {
            "size": 0,
            "query": {
                "bool": {
                    "must": new Array()
                }
            },
            "aggs": {}
        };

        if (search_string) {
            if (search_string_fields) {
                body["query"]["bool"]["must"].push({ "query_string": { "query": "*" + search_string + "*", "fields": search_string_fields, "type": "most_fields", "minimum_should_match": 2 } });
            }
            else {
                body["query"]["bool"]["must"].push({ "query_string": { "query": "*" + search_string + "*", "type": "most_fields", "minimum_should_match": 2 } });
            }
        }

        const listPromises: Promise<any>[] = new Array();
        let filters = new Array();
        let newBody;
        let newWhere;

        let unselectedFields = new Array();
        distinct_fields.forEach(field => {
            newBody = JSON.parse(JSON.stringify(body));
            newWhere = where ? JSON.parse(JSON.stringify(where.filter(x => !x.includes(field)))) : undefined;
            if (newWhere == where || newWhere.length == where.length) {
                unselectedFields.push(field);
            }
            else {
                newBody["aggs"][field.replace(".Value", "")] = {
                    "terms": { "script": `params._source['${field}']`, "size": 200, "order": { "_term": "asc" } }
                };
                QueryUtil.convertWhereToQuery(newWhere, newBody);
                listPromises.push(callElasticSearchLambda(endpoint, method, JSON.stringify(newBody)));
            }
        });

        if (unselectedFields.length > 0) {
            newBody = JSON.parse(JSON.stringify(body));;
            unselectedFields.forEach(field => {
                newBody["aggs"][field.replace(".Value", "")] = { "terms": { "script": `params._source['${field}']`, "size": 100, "order": { "_term": "asc" } } };
            });
            QueryUtil.convertWhereToQuery(where, newBody);
            listPromises.push(callElasticSearchLambda(endpoint, method, JSON.stringify(newBody)));
        }

        await Promise.all(listPromises).then(
            function (res) {
                var i = 0;
                while (i < res.length) {
                    let filter = {};
                    Object.keys(res[i].resultObject.aggregations).forEach(function (key) {
                        filter = {};
                        filter["APIName"] = key;
                        filter["Values"] = res[i].resultObject.aggregations[key].buckets;
                        filters.push(filter);
                    });
                    i++;
                }
            }
        );

        return filters;
    } catch (e) {
        console.log(`error in audit_data_log: ${(e as Error).message}`);
        throw new Error((e as Error).message);
    }
};

export async function totals(client: Client, request: Request) {

    const endpoint = `${Constants.AUDIT_DATA_LOG_INDEX}/_count`;
    const method = 'GET';
    const response = await callElasticSearchLambda(endpoint, method);
    if (!response.success) {
        throw new Error(response["errorMessage"]);
    }

    if (response.resultObject.error) {
        throw new Error(response.resultObject.error.reason + ". " + response.resultObject.error.details);
    }
    return response;

};


export async function get_logs_from_cloud_watch(client: Client, request: Request) {
    // return query response of a this query to cloud watch
    console.log('APIAddon start getAddonsUsageFromCWL');

    try {
        const AWS = require('aws-sdk');
        
       
        const cwl = new AWS.CloudWatchLogs();
        let logGroupsNames: string[] = request.query.log_groups ? request.query.log_groups.split(',') : undefined;

        if (!logGroupsNames) {
            logGroupsNames = getLogGroups();
        }
        const startTime = new Date(request.body.StartDateTime).getTime();
        const endTime = new Date(request.body.EndDateTime).getTime();

        let filter = buildInsightFilter(client, request);
        // the query returns the count and duration of api calls per addon on this time range
        const startQueryParams = {
            startTime: startTime,
            endTime: endTime,
            queryString: `fields @timestamp, Message, Level, Source
            | sort @timestamp desc
            | filter ${filter}`,
            logGroupNames: logGroupsNames
        };

        const queryId = (await cwl.startQuery(startQueryParams).promise()).queryId;

        // get query results
        let queryResults = await getQueryResults(queryId, cwl);

        return queryResults;
    }
    catch (err) {
        
        console.log(`APIAddon getAddonsUsageFromCWL failed with err: ${(err as Error).message}`);
        return err;
        
    }
};

export async function get_stats_from_cloud_watch(client: Client, request: Request) {
    // return query response of a this query to cloud watch
    try {
        const AWS = require('aws-sdk');
        
        const cwl = new AWS.CloudWatchLogs();

        // query params
        let logGroupsNames: string[] = request.query.log_groups ? request.query.log_groups.split(',') : undefined;

        if (!logGroupsNames) {
            logGroupsNames = getLogGroups();
        }
        const startTime = new Date(request.body.StartDateTime).getTime(); // on format
        const endTime = new Date(request.body.EndDateTime).getTime();
        const distinctFields = request.query.distinct_field;

        let filter = buildInsightFilter(client, request);
        // the query returns the count and duration of api calls per addon on this time range
        const startQueryParams = {
            startTime: startTime,
            endTime: endTime,
            queryString: `fields @timestamp, Message, Level, Source
            | sort @timestamp desc
            | filter ${filter}
            | stats count() as count by ${distinctFields}`,
            logGroupNames: logGroupsNames
        };

        const queryId = (await cwl.startQuery(startQueryParams).promise()).queryId;

        // get query results
        let queryResults = await getQueryResults(queryId, cwl);
        const stats = {};
        distinctFields.split(',').forEach(distinctField => {
            stats[distinctField] = {};
        });

        queryResults.results.forEach(res => {
            Object.keys(stats).forEach((key) => {
                let distValue = res.find(x => x.field == key)?.value;
                let distCount = res.find(x => x.field == 'count')?.value;
                if (distValue && distCount) {
                    if (Object.keys(stats[key]).indexOf(distValue) > -1) {
                        stats[key][distValue] += parseInt(distCount);
                    }
                    else {
                        stats[key][distValue] = parseInt(distCount);
                    }
                }
            });
        });

        return stats;
    }
    catch (err) {
        console.log(`APIAddon getAddonsUsageFromCWL failed with err: ${(err as Error).message}`);
        return err;
    }
};

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};


async function getQueryResults(queryId: any, cwl: any) {
    const queryResultsParams = {
        queryId: queryId
    };
    let queryResults = await cwl.getQueryResults(queryResultsParams).promise();
    while (queryResults.status != 'Complete') {
        await sleep(500);
        queryResults = await cwl.getQueryResults(queryResultsParams).promise();
    }
    return queryResults;
}

function getLogGroups() {
    const logGroups = [
        '/aws/lambda/AddonsExecuteJavaScriptLambdaAsync',
        '/aws/lambda/ExecuteAddon',
        '/aws/lambda/ExecuteAddonAdminSync',
        '/aws/lambda/ExecuteAddonAdminSyncByVersion',
        '/aws/lambda/ExecuteAddonByVersion',
        '/aws/lambda/ExecuteAddonSync',
        '/aws/lambda/ExecuteAddonSyncByVersion',
        'Nucleus',
        'ApiInternal',
        'WACD'
    ];

    return logGroups;
}

function buildInsightFilter(client: Client, request: Request) {
    const distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
    const distributorID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributorid"];

    const actionUUID = request.query.action_uuid;
    const Level = request.query.level;
    const addonUUID = request.query.addon_uuid;
    const searchString = request.query.search_string
    const searchStringFields = request.query.search_string_fields ? request.query.search_string_fields.split(',') : ['Message']

    let filter = `(DistributorUUID='${distributorUUID}' OR DistributorID='${distributorID}')`;
    if (Level) {
        filter += ` and Level in [${Level}]`;
    }
    if (actionUUID) {
        filter += ` and ActionUUID='${actionUUID}'`;
    }
    if (addonUUID) {
        filter += ` and AddonUUID='${addonUUID}'`;
    }
    if (searchString) {
        const arr: string[] = [];
        searchStringFields.forEach(searchStringField => {
            arr.push(`(${searchStringField} like /(?i)${searchString}/)`)
        });
        filter += ` and (${arr.join(" OR ")})`;
    }
    return filter;
}