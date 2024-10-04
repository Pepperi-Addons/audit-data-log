import { Client, Request } from '@pepperi-addons/debug-server'
import { Document, UpdatedField } from "../shared/models/document"
import { Constants } from "../shared/constants"
import * as os from 'os';
import jwtDecode from 'jwt-decode';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import QueryUtil from '../shared/utilities/query-util'
import { CPAPIUsage } from './CPAPIUsage';
import { Helper } from '@pepperi-addons/papi-sdk';
import PermissionManager from './permission-manager.service';
import { InternalSyncService } from './elastic-sync-data/internal-sync.service';
import { SyncJobsService } from './elastic-sync-data/sync-jobs.service';
import { SyncDataAggregations } from './elastic-sync-data/sync-data-aggregations.service';
import { UptimeSyncService } from './elastic-sync-data/uptime-sync';
import { SmartFilters } from './elastic-sync-data/smart-filters.service';
import DataRetrievalService from './data-retrieval.service';
import { SyncEffectivenessService } from './elastic-sync-data/sync_effectiveness.service';

const helper = new Helper()

export async function get_elastic_search_lambda(client: Client, request: Request) {
    const dataRetrievalService = new DataRetrievalService(client);

    const endpoint = `${Constants.AUDIT_DATA_LOG_INDEX}/_search`;
    request.header = helper.normalizeHeaders(request.header)
    await dataRetrievalService.validateHeaders(request.header['x-pepperi-secretkey'].toLowerCase());

    try {
        console.log(`About to search data in elastic, calling callElasticSearchLambda`);
        const res = await callElasticSearchLambda(endpoint, 'POST', request.body);
        console.log(`Successfully called callElasticSearchLambda and got data.`);
        return res.resultObject.hits.hits;
    } catch (err) {
        throw new Error(`Could not search data in elastic, error: ${err}`);
    }
}

export async function get_audit_log_data_by_field_id(client: Client, request: Request) {
    const dataRetrievalService = new DataRetrievalService(client);
    const auditLogs = await audit_data_logs_by_field_id(request);
    const users = await dataRetrievalService.get_users(auditLogs, "UserUUID");
    return {
        AuditLogs: auditLogs,
        Users: users,
    }
}
export async function get_audit_log_data(client: Client, request: Request) {
    const dataRetrievalService = new DataRetrievalService(client);

    const auditLogs = await audit_data_logs(client, request);
    const users = await dataRetrievalService.get_users(auditLogs, "UserUUID");
    const addons = await dataRetrievalService.get_addons(auditLogs, "AddonUUID");
    return {
        AuditLogs: auditLogs,
        Users: users,
        Addons: addons
    }
}

export async function get_filters_data(client: Client, request: Request) {
    const dataRetrievalService = new DataRetrievalService(client);

    const auditLogs = await filters(client, request);
    const users = await dataRetrievalService.get_users((auditLogs.find(x => x.APIName === 'UserUUID')).Values, "key");
    const addons = await dataRetrievalService.get_addons((auditLogs.find(x => x.APIName === 'AddonUUID')).Values, "key");
    return {
        AuditLogs: auditLogs,
        Users: users,
        Addons: addons
    }
}

// for health monitor addon- get syncs data from elastic
// daily downtime- for usage monitor data usage
export async function get_last_day_downtime_from_elastic(client: Client, request: Request) {
    request.header = helper.normalizeHeaders(request.header);
    const uptimeSyncService = new UptimeSyncService(client, request.header['x-pepperi-ownerid'], request.body.CodeJobUUID, request.body.MonitorLevel);
    return await uptimeSyncService.getDailyDowntime();
}

// health dashbaord tab
export async function get_sync_aggregations_from_elastic(client: Client, request: Request) {
    request.header = helper.normalizeHeaders(request.header);
    const syncAggregationService = new SyncDataAggregations(client, request.header['x-pepperi-ownerid'], request.body.DataType, request.body.Offset);
    return await syncAggregationService.getSyncsResult();
}

// KPI tab- uptime cards
export async function get_uptime_sync_from_elastic(client: Client, request: Request) {
    request.header = helper.normalizeHeaders(request.header);
    const uptimeSyncService = new UptimeSyncService(client, request.header['x-pepperi-ownerid'], request.body.CodeJobUUID, request.body.MonitorLevel);
    return await uptimeSyncService.getSyncsResult();
}

// KPI tab- sync effectiveness
export async function get_sync_effectiveness_from_elastic(client: Client, request: Request) {
    request.header = helper.normalizeHeaders(request.header);
    const uptimeSyncService = new SyncEffectivenessService(client, request.header['x-pepperi-ownerid']);
    return await uptimeSyncService.getSyncsResult();
}

// internal sync table (health monitor jobs)
export async function get_internal_syncs_from_elastic(client: Client, request: Request) {
    request.header = helper.normalizeHeaders(request.header);
    const internalSyncDataService = new InternalSyncService(client, request.header['x-pepperi-ownerid'], request.body.CodeJobUUID, request.body.Params);
    return await internalSyncDataService.getSyncsResult();
}

// sync jobs table
export async function get_syncs_from_elastic(client: Client, request: Request) {
    request.header = helper.normalizeHeaders(request.header);
    const syncJobsService = new SyncJobsService(client, request.header['x-pepperi-ownerid'], request.body);
    return await syncJobsService.getSyncsResult();
}

// smart filters
export async function get_smart_filters_from_elastic(client: Client, request: Request) {
    request.header = helper.normalizeHeaders(request.header);
    const syncJobsService = new SmartFilters(client, request.header['x-pepperi-ownerid'], request.body.CodeJobUUID, request.body.Params, request.body.DataType);
    return await syncJobsService.getSyncsResult();
}

// get functions computing time from elastic
export async function get_functions_computing_time_from_elastic(client: Client, request: Request): Promise<any> {
    // await client.ValidatePermission(PermissionManager.computingTimePolicyName); // validate only admins can get computed functions time

    // const computingTime = new ComputeFunctionsDuration(client);
    // const resultObject = await computingTime.getComputedTimeForUsage()
    // return resultObject;    
}

export async function transactions_and_activities_data(client) {
    let CPapiUsage = new CPAPIUsage(client);
    let createdObjectMap = await CPapiUsage.calculateLastDayUsage();
    let Resource: any[] = [];

    for (let key of createdObjectMap.keys()) {
        let description: string = `Number of ${key.split(' ')[1]} on ${key.split(' ')[2]} created by ${key.split(' ')[0]}`;
        let data: string = `${key.split(' ')[0]} ${key.split(' ')[1]} - ${key.split(' ')[2]}`;
        let value = createdObjectMap.get(key);
        let resource = {
            Data: data,
            Description: description,
            Size: value
        };
        Resource.push(resource);
    }

    let returnObject = {
        "Title": "Usage",
        "Resources": Resource
    }

    return returnObject;
}


export async function write_data_log_to_elastic_search(client: Client, request: Request) {

    let body = request.body;
    console.log(`start write data log to elastic search ActionUUID:${body.Message.ActionUUID}`);
    const distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
    const service = new DataRetrievalService(client);

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

    console.log(`finish write data log to elastic search ActionUUID:${body.Message.ActionUUID}`);

};
interface AsyncResponse { success: boolean, resultObject: any, errorMessage?: undefined };

export async function post_to_elastic_search(client: Client, request: Request) {

    const body = request.body;
    const endpoint = `/${Constants.AUDIT_DATA_LOG_INDEX}/_bulk`
    const method = 'POST';

    // we wait as much as we can without killing the lambda (lambda timeout is 30 seconds)
    const maxWaitingForElastic = 28000;
    let timer: NodeJS.Timeout | undefined;
    // this promise will never be resolved only rejected with exception
    const timeoutPromise: Promise<AsyncResponse> = new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
            const msg: string = `Done waiting on elastic to write audit logs for ${maxWaitingForElastic / 1000} seconds`;
            console.error(msg)
            reject(new Error(msg))
        }, maxWaitingForElastic);
    })
    // call elastic - main line :)
    const elasticPromise = callElasticSearchLambda(endpoint, method, body, "application/x-ndjson");
    let response = await Promise.race([elasticPromise, timeoutPromise]);
    // if we reach here 
    // 1. response has a returned value from elastic (otherwise we will get exception)
    // 2. timer must have a value 
    if (timer != undefined) {
        console.log("clearing timeout as audit log write succeded");
        clearTimeout(timer);
    }
    else {
        console.error("NOTE and investigate: Cannot clear timeout even when elastic audit log write succeded")
    }
    if (!response.success) {
        throw new Error(response.errorMessage);
    }

    if (response.resultObject.error) {
        throw new Error(response.resultObject.error.reason + ". " + response.resultObject.error.details);
    }
}


export async function audit_data_logs(client: Client, request: Request) {
    await client.ValidatePermission(PermissionManager.auditLogPolicyName); // validate only admins can see audit data log UI

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
                    "terms": { "field": `${field}.keyword`, "size": 200, "order": { "_term": "asc" } }
                };
                QueryUtil.convertWhereToQuery(newWhere, newBody);
                listPromises.push(callElasticSearchLambda(endpoint, method, JSON.stringify(newBody)));
            }
        });

        if (unselectedFields.length > 0) {
            newBody = JSON.parse(JSON.stringify(body));;
            unselectedFields.forEach(field => {
                newBody["aggs"][field.replace(".Value", "")] = { "terms": { "field": `${field}.keyword`, "size": 100, "order": { "_term": "asc" } } };
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

async function audit_data_logs_by_field_id(request: Request) {
    try {
        const page_size = request.query.page_size ? request.query.page_size : 200;
        const from = 0;
        const fields = [
            'ActionUUID',
            'AddonUUID',
            'ObjectKey',
            'DistributorUUID',
            'ObjectModificationDateTime',
            'CreationDateTime',
            'UserUUID',
            'ActionType',
            'Resource',
            'UpdatedFields'
        ];
        // prepare script to filter by FieldID, to filter array of objects
        const source = `def result = [];
                            for (field in params['_source']['UpdatedFields']) {
                                if (field.FieldID == "${request.query.field_id}") {
                                    result.add(field);
                                }
                            }
                            return result;
                        `;

        let where: string[] = request.query.where ? request.query.where.split(" and ") : [];
        let body = {
            "size": page_size,
            "from": from,
            "track_total_hits": true,
            "query": {
                "bool": {
                    "must": new Array()
                }
            },
            _source: new Array(),
            script_fields: {
                filtered_updated_fields: {
                    script: {
                        source,
                    }
                }
            }

        };
        const order_by = request.query.order_by ? request.query.order_by.split(" ") : undefined;
        // prepare a query for elastic search
        QueryUtil.convertParamsToQuery(fields, where, order_by, body);
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
        let docs = new Array();
        response.hits.hits.forEach(item => {
            if (request.query.field_id) {
                if (item.fields?.filtered_updated_fields) {
                    // replace with filtered data 
                    item['_source']['UpdatedFields'] = item.fields.filtered_updated_fields;
                    docs.push(item._source);
                }
            } else {
                docs.push(item._source);
            }
        });
        return docs;
    } catch (e) {
        console.log(`error in audit_data_logs_by_field_id: ${(e as Error).message}`);
        throw new Error((e as Error).message);
    }
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