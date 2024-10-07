import jwt from 'jwt-decode';
import { AddonData, AuditLog, PapiClient, User } from '@pepperi-addons/papi-sdk';
import { Injectable } from '@angular/core';
import { Document } from "../../../../../shared/models/document"

import {
    PepAddonService,
    // PepAddonService, PepHttpService, PepDataConvertorService,
    PepSessionService
} from '@pepperi-addons/ngx-lib';
import { PepDialogActionButton, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { config } from '../../addon.config';
@Injectable({ providedIn: 'root' })
export class AuditDataLogBlock {
    accessToken = '';
    parsedToken: any
    papiBaseURL = ''
    addonUUID = config.AddonUUID;
    isSupportAdminUser: boolean = true;



    get papiClient(): PapiClient {
        return new PapiClient({
            baseURL: this.papiBaseURL,
            token: this.session.getIdpToken(),
            addonUUID: this.addonUUID,
            suppressLogging: true
        })
    }

    constructor(
        public session: PepSessionService,
        private addonService: PepAddonService,
        // public addonService:  PepAddonService
        // ,public httpService: PepHttpService
        // ,public pepperiDataConverter: PepDataConvertorService
        private dialogService: PepDialogService
    ) {
        const accessToken = this.session.getIdpToken();
        this.parsedToken = accessToken ? jwt(accessToken) : {};
        this.papiBaseURL = this.parsedToken["pepperi.baseurl"];
        this.isSupportAdminUser = this.parsedToken["email"].startsWith("SupportAdminUser");
    }

    async getExecutionLog(executionUUID): Promise<AuditLog> {
        return this.papiClient.get(`/audit_logs/${executionUUID}`);
    }

    async getUsers() {
        const users = await this.papiClient.users.iter({
            fields: ['InternalID', 'Email', 'UUID'],
            page_size: -1
        }).toArray();

        const contacts = await this.papiClient.get('/contacts?fields=InternalID,Email,UUID');
        return [...users, ...contacts]
    }

    async getSupportAdminUser() {
        const supportAdminUser = await this.papiClient.get('/distributor');
        return supportAdminUser.SupportAdminUser.Name;
    }
    async getAddons() {
        return await this.papiClient.addons.iter({
            page_size: -1
        }).toArray();
    }

    async getUserBuUUID(uuid: string) {
        return this.papiClient.get(`/users/uuid/${uuid}`);
    }

    audit_data_log_query(search_string: string, where: string, search_string_fields: string): Observable<any> {
        const params = {};
        if (search_string) {
            params[`search_string`] = search_string;
        }
        if (where) {
            params[`where`] = where;
        }
        if (search_string_fields) {
            params[`search_string_fields`] = search_string_fields;
        }
        params['order_by'] = 'ObjectModificationDateTime desc';
        params['page_size'] = 200;


        return this.addonService.getAddonApiCall(
            this.addonUUID,
            'api',
            'get_audit_log_data',
            { params: params },
            false
        );
    }

    audit_data_log_distinct_values(search_string: string, where: string, search_string_fields: string, distinct_value: string) {
        let params = {};
        if (search_string) {
            params[`search_string`] = search_string;
        }
        if (search_string_fields) {
            params[`search_string_fields`] = search_string_fields;

        }
        if (where) {
            params[`where`] = where;
        }
        params[`distinct_fields`] = distinct_value;
        return this.addonService.getAddonApiCall(
            this.addonUUID,
            'api',
            'get_filters_data',
            { params: params },
            false
        );
    }

    cloud_watch_logs(start_data: Date, end_data: Date, addon_uuid: string, action_uuid: string, search_string: string, search_string_fields: string, level: string, logGroups: string) {
        let params = this.buildCloudWatchParams(addon_uuid, action_uuid, search_string, search_string_fields, level, logGroups);
        const body = {
            StartDateTime: start_data.toUTCString(),
            EndDateTime: end_data.toUTCString()
        };
        return this.addonService.postAddonApiCall(
            this.addonUUID,
            'api',
            'get_logs_from_cloud_watch',
            body,
            { params: params },
            false
        );
    }

    cloud_watch_logs_stats(start_data: Date, end_data: Date, addon_uuid: string, action_uuid: string, search_string: string, search_string_fields: string, distinct_field: string, levels: string, logGroups: string) {
        let params = this.buildCloudWatchParams(addon_uuid, action_uuid, search_string, search_string_fields, levels, logGroups);
        params['distinct_field'] = distinct_field;
        const body = {
            StartDateTime: start_data.toUTCString(),
            EndDateTime: end_data.toUTCString()
        };
        return this.addonService.postAddonApiCall(
            this.addonUUID,
            'api',
            'get_stats_from_cloud_watch',
            body,
            { params: params },
            false
        );
    }

    async field_id_audit_data_log_query(where: string, property: string) {
        const params = {};
        if (where) {
            params[`where`] = where;
        }
        if (property) {
            params['field_id'] = property;
        }

        params['order_by'] = 'ObjectModificationDateTime desc';
        params['page_size'] = 200;


        return await firstValueFrom(this.addonService.getAddonApiCall(
            this.addonUUID,
            'api',
            'get_audit_log_data_by_field_id',
            { params: params },
            false
        ));
    }


    private buildCloudWatchParams(addon_uuid: string, action_uuid: string, search_string: string, search_string_fields: string, level: string, logGroups: string) {
        let params = {};
        // TODO - remove when the nucules will be real addon
        if (addon_uuid === '00000000-0000-0000-0000-00000000c07e') {
            logGroups = 'Nuclues'
        }
        if (addon_uuid && addon_uuid != '00000000-0000-0000-0000-00000000c07e') {
            params[`addon_uuid`] = addon_uuid;;
        }
        if (action_uuid) {
            params[`action_uuid`] = action_uuid;
        }
        if (search_string) {
            params[`search_string`] = search_string;
        }
        if (level) {
            params[`level`] = level;
        }
        if (logGroups) {
            params[`log_groups`] = logGroups;
        }
        if (search_string_fields) {
            params[`search_string_fields`] = search_string_fields;
        }
        return params;
    }

    openDialog(title: string, content: string, callback?: any) {
        const actionButton: PepDialogActionButton = {
            title: "OK",
            className: "",
            callback: callback,
        };

        const dialogData = new PepDialogData({
            title: title,
            content: content,
            actionButtons: [actionButton],
            actionsType: "custom",
            showClose: false,
        });
        this.dialogService.openDefaultDialog(dialogData);
    }

    async getAsyncJobs(where: string): Promise<AddonData[]> {
        try {
            const allExecutions = await this.papiClient.get(`/audit_logs?where=${where}`);
            return allExecutions;
        } catch (error) {
            console.error(`Got error while getting all executions for where query: ${where}- ${error}`)
        }
    }
}
