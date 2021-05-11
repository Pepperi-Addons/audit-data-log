export default class QueryUtil {

    static convertParamsToQuery(fields, where, order_by, body) {
        if (fields) {
            this.convertFieldsToQuery(fields, body);
        }

        if (where) {
            this.convertWhereToQuery(where, body);
        }

        if (order_by) {
            this.convertOrderByToQuery(order_by, body)
        }

        return;
    }

    static convertFieldsToQuery(fields, body) {
        body["_source"] = fields;
        return;
    }

    static convertWhereToQuery(where, body) {
        if (!where) {
            return;
        }

        if (where.toString().includes("!=")) {
            body["query"]["bool"]["must_not"] = new Array();
        }

        for (var i in where) {
            if (where[i].includes("!=")) {
                const condition = where[i].split("!=");
                let keyValue = {};
                let values = new Array();
                condition[1].split(",").forEach(value => {
                    values.push(value);
                });
                keyValue[condition[0]] = values;
                body["query"]["bool"]["must_not"].push({ "terms": keyValue });
            }
            else if (where[i].includes(">=")) {
                const condition = where[i].split(">=");
                let expression = { "range": {} };
                expression["range"][condition[0]] = { "gte": condition[1] };
                body["query"]["bool"]["must"].push(expression);
            }
            else if (where[i].includes("<=")) {
                const condition = where[i].split("<=");
                let expression = { "range": {} };
                expression["range"][condition[0]] = { "lte": condition[1] };
                body["query"]["bool"]["must"].push(expression);
            }
            else if (where[i].includes("=")) {
                let condition = where[i].split("=");
                let keyValue = {};
                let values = new Array();
                condition[1].split(",").forEach(value => {
                    values.push(value);
                });
                keyValue[condition[0]] = values;
                body["query"]["bool"]["must"].push({ "terms": keyValue });
            }
            else if (where[i].includes(">")) {
                const condition = where[i].split(">");
                let expression = { "range": {} };
                expression["range"][condition[0]] = { "gt": condition[1] };
                body["query"]["bool"]["must"].push(expression);
            }
            else if (where[i].includes("<")) {
                const condition = where[i].split("<");
                let expression = { "range": {} };
                expression["range"][condition[0]] = { "lt": condition[1] };
                body["query"]["bool"]["must"].push(expression);
            }
        }
        return;
    }

    static convertOrderByToQuery(order_by, body) {
        const order_by_field = order_by[0];
        const order_by_asc = order_by[1] ? order_by[1].toLowerCase() : "asc";
        const expression = { "sort": {} };
        expression["sort"][order_by_field] = { "order": order_by_asc };
        body["sort"] = expression["sort"];
        return;
    }

    static buildWhereClauseByDateField(filter) {
        const dateRange = QueryUtil.getStartAndEndDateTimeByFilter(filter);
        const whereClause = `ObjectModificationDateTime>=${dateRange.StartDateTime.toISOString()} and ObjectModificationDateTime<=${dateRange.EndDateTime.toISOString()}`;
        return whereClause;
    }

    static getStartAndEndDateTimeByFilter(filter) {
        let now = new Date();
        let startDateTime;
        let endDateTime = new Date();

        switch (filter.operator.id) {
            case 'today':
                var start = new Date();
                start.setHours(0, 0, 0, 0);
                startDateTime = start;
                break;
            case 'thisWeek':
                startDateTime = new Date(new Date(now).setDate(now.getDate() - 7));
                break;
            case 'thisMonth':
                startDateTime = new Date(new Date(now).setMonth(now.getMonth() - 1));
                break;
            case 'after':
                startDateTime = new Date(new Date(now).setMonth(now.getMonth() - 1));
                break;
            case 'inTheLast':
                startDateTime = this.calculateStartDate(filter);
                break;
            case 'on':
            case 'before':
                startDateTime = new Date(filter.value.first);
                break;
            case 'dateRange':
                startDateTime = new Date(filter.value.first);
                endDateTime = new Date(filter.value.second);
                break;

        }
        return { StartDateTime: startDateTime, EndDateTime: endDateTime };
    }

    static calculateStartDate(filter) {
        var now = new Date()
        var startDate = new Date()

        switch (filter.operatorUnit.id) {
            case 'days':
                startDate = new Date(new Date(now).setDate(now.getDate() - filter.value.first));
                break;
            case 'months':
                startDate = new Date(new Date(now).setDate(now.getMonth() - filter.value.first));
                break;
            case 'weeks':
                startDate = new Date(new Date(now).setDate(now.getDate() - (filter.value.first * 7)));
                break;
            case 'years':
                startDate = new Date(new Date(now).setDate(now.getFullYear() - filter.value.first));
                break;

        }
        return startDate;
    }
}



