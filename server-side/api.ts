import MyService from './my.service'
import { Client, Request } from '@pepperi-addons/debug-server'
import { Document, UpdatedField } from "../shared/models/document"
import { Constants } from "../shared/constants"
import { v4 as uuid } from 'uuid';
import * as os from 'os';
import jwtDecode from 'jwt-decode';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import QueryUtil from '../shared/utilities/query-util'

export async function write_data_log_to_elastic_search(client: Client, request: Request) {

    const distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
    console.log("start write data log to elastic search");
    const service = new MyService(client);
    const body = request.body;

    console.log(`body: ${JSON.stringify(body)}`);

    const dateString = new Date().toISOString();
    let bulkBody = new Array();

    console.log(`body.Message.ModifiedObjects" ${body.Message.ModifiedObjects}`);

    for (const object of body.Message.ModifiedObjects) {
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
    console.log(`going to upsert to data audit log. body: ${bulkBodyNDJSON}`);
    const response = await service.papiClient.post("/addons/api/" + client.AddonUUID + "/api/post_to_elastic_search", bulkBodyNDJSON);

    console.log(`response from upsert to data audit log. response: ${JSON.stringify(response)}`);

};

export async function post_to_elastic_search(client: Client, request: Request) {


    const body = request.body;
    const endpoint = `/${Constants.AUDIT_DATA_LOG_INDEX}}/_bulk`
    const method = 'POST';

    console.log(`at post_to_elastic_search, body: ${body}`)
    const response = await callElasticSearchLambda(endpoint, method, body, "application/x-ndjson");

    if (!response.success) {
        throw new Error(response["errorMessage"]);
    }

    if (response.resultObject.error) {
        throw new Error(response.resultObject.error.reason + ". " + response.resultObject.error.details);
    }
    console.log(`response : ${JSON.stringify(response)}`);


}

export async function audit_data_logs(client: Client, request: Request) {

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
    console.log(`at items: body : ${JSON.stringify(body)}`)
    const lambdaResponse = await callElasticSearchLambda(endpoint, method, JSON.stringify(body));
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
};

export async function filters(client: Client, request: Request) {

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
            body["query"]["bool"]["must"].push({ "query_string": { "query": "*" + search_string + "*", "fields": search_string_fields, "type": "most_fields" } });
        }
        else {
            body["query"]["bool"]["must"].push({ "query_string": { "query": "*" + search_string + "*", "type": "most_fields" } });
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
                "terms": { "script": `params._source['${field}']`, "size": 100, "order": { "_term": "asc" } }
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
    console.log(`response : ${JSON.stringify(response)}`);
    return response;

};


export async function get_logs_from_cloud_watch(client: Client, request: Request) {
    // return query response of a this query to cloud watch
    console.log('APIAddon start getAddonsUsageFromCWL');

    try {
        const AWS = require('aws-sdk');
        const cwl = new AWS.CloudWatchLogs();

        const relevantLogGroups = await getLogGroups();
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
            logGroupNames: relevantLogGroups
        };
        console.log(`startQueryParams: ${JSON.stringify(startQueryParams)}`)

        const queryId = (await cwl.startQuery(startQueryParams).promise()).queryId;

        // get query results
        let queryResults = await getQueryResults(queryId, cwl);

        return queryResults;
    }
    catch (err) {
        console.log(`APIAddon getAddonsUsageFromCWL failed with err: ${err.message}`);
        return err;
    }
};

export async function get_stats_from_cloud_watch(client: Client, request: Request) {
    // return query response of a this query to cloud watch
    try {
        const AWS = require('aws-sdk');
        const cwl = new AWS.CloudWatchLogs();

        // query params
        const relevantLogGroups = await getLogGroups();
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
            logGroupNames: relevantLogGroups
        };
        console.log(`startQueryParams: ${JSON.stringify(startQueryParams)}`)

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
        console.log(`APIAddon getAddonsUsageFromCWL failed with err: ${err.message}`);
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

async function getLogGroups() {
    const logGroups = [
        '/aws/lambda/AddonsExecuteJavaScriptLambdaAsync',
        '/aws/lambda/ExecuteAddon',
        '/aws/lambda/ExecuteAddonAdminSync',
        '/aws/lambda/ExecuteAddonAdminSyncByVersion',
        '/aws/lambda/ExecuteAddonByVersion',
        '/aws/lambda/ExecuteAddonSync',
        '/aws/lambda/ExecuteAddonSyncByVersion',
        'Nuclues',
        'ApiInternal'
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
        filter += ` and (Message like /(?i)${searchString}/ OR Level like /(?i)${searchString}/)`;
    }
    return filter;
}