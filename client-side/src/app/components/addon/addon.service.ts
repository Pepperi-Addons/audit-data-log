import jwt from 'jwt-decode';
import { PapiClient, User } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';
import { Document } from "../../../../../shared/models/document"

import {
    // PepAddonService, PepHttpService, PepDataConvertorService,
    PepSessionService
} from '@pepperi-addons/ngx-lib';
// import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
// import {AddonUUID} from '../../../../../addon.config.json';
@Injectable({ providedIn: 'root' })
export class AddonService {
    accessToken = '';
    parsedToken: any
    papiBaseURL = ''
    addonUUID;

    get papiClient(): PapiClient {
        return new PapiClient({
            baseURL: this.papiBaseURL,
            token: this.session.getIdpToken(),
            addonUUID: this.addonUUID,
            suppressLogging: true
        })
    }

    constructor(
        public session: PepSessionService
        // public addonService:  PepAddonService
        // ,public httpService: PepHttpService
        // ,public pepperiDataConverter: PepDataConvertorService
        // ,public dialogService: PepDialogService
    ) {
        const accessToken = this.session.getIdpToken();
        this.parsedToken = accessToken ? jwt(accessToken) : {};
        this.papiBaseURL = this.parsedToken["pepperi.baseurl"];
    }

    async getUsers() {
        return await this.papiClient.users.iter({
            fields: ['InternalID', 'Email', 'UUID'],
            page_size: -1
        }).toArray();
    }

    async getAddons() {
        return await this.papiClient.addons.iter({
            page_size: -1
        }).toArray();
    }

    async getUserBuUUID(uuid: string) {
        return this.papiClient.get(`/users/uuid/${uuid}`);
    }

    async audit_data_log_query(search_string: string, where: string, search_string_fields: string) {
        const params = {};
        if (search_string) {
            params[`search_string`] = search_string;
        } else if (where) {
            params[`where`] = where;
        } else if (search_string_fields) {
            params[`search_string_fields`] = search_string_fields;
        }
        params['order_by'] = 'ObjectModificationDateTime desc'
        return await this.papiClient.addons.api.uuid(this.addonUUID).file('api').func('audit_data_logs').get(params);
    }

    async audit_data_log_count() {
        return await this.papiClient.addons.api.uuid(this.addonUUID).file('api').func('totals').get();
    }


    async audit_data_log_distinct_values(distinct_value: string[]) {
        return await this.papiClient.addons.api.uuid(this.addonUUID).file('api').func('filters').get({
            'distinct_fields': distinct_value,
        });
    }


    async cloud_watch_logs(start_data: Date, end_data: Date, addon_uuid: string, action_uuid: string) {
        let params = {};
        if (addon_uuid) {
            params[`addon_uuid`] = `'${addon_uuid}'`;;
        }
        if (action_uuid) {
            params[`action_uuid`] = `'${action_uuid}'`;

        }
        const body = {
            StartDateTime: start_data.toLocaleString(),
            EndDateTime: end_data.toLocaleString()
        };
        return await this.papiClient.addons.api.uuid(this.addonUUID).file('api').func('get_logs_from_cloud_watch').post(params, body);
    }
}
