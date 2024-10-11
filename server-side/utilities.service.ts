import { Client, Request } from "@pepperi-addons/debug-server/dist";
import DataRetrievalService from "./data-retrieval.service";
import { AddonData } from "@pepperi-addons/papi-sdk";
import { BYPASS_CLIENT_ADDONS, LOGS_ACTION_TYPES, VALID_SOURCES } from "./entities";
import { UpsertResponseObject } from "../shared/models/document";
export class UtilitiesService {

    /**
     * Function to validate the secret key and also match the ownerUUID with AddonUUID 
     * @param client 
     * @param request 
     */
    async validateOwner(client: Client, request: Request) {
        const ownerUUID = request.header['x-pepperi-ownerid'].toLowerCase();
        const addonSecretKey = request.header['x-pepperi-secretkey'].toLowerCase()
        if (!ownerUUID || !addonSecretKey) {
            const errorMessage = 'Missing headers, make sure you send ownerID & SecretKey'
            throw new Error(errorMessage)
        }

        if (client.AddonUUID !== ownerUUID) {
            throw new Error('AddonUUID must be equal to X-Pepperi-OwnerID header value');
        }
        try {
            const dataRetrievalService = new DataRetrievalService(client);
            await dataRetrievalService.validateHeaders(addonSecretKey);
        } catch (err) {
            console.error('got error: ', JSON.stringify(err));
            throw new Error("Failed to verify secret key");
        }
    }

    /**
     * Function to validate body Objects
     * @param object 
     * @param clientAddonUUID 
     * @param responseArr 
     * @returns 
     */
    validateObject(object: AddonData, clientAddonUUID: string, responseArr: UpsertResponseObject[]): boolean {
        const validSources = new Set(VALID_SOURCES);
        const byPassClientAddons = new Set(BYPASS_CLIENT_ADDONS);
        const validActionTypes = new Set(LOGS_ACTION_TYPES);
        // Validate Source
        if (!object.Source || !validSources.has(object.Source)) {
            console.error(`Invalid Source: ${object.Source}`);
            responseArr.push({
                Key: object.ObjectKey,
                Status: 'Error',
                Details: `Invalid Source: ${object.Source}`
            });
            return false; // Invalid Source
        }
        // Validate AddonUUID
        if (object.AddonUUID !== clientAddonUUID && !byPassClientAddons.has(clientAddonUUID)) {
            console.error(`Data source AddonUUID: ${object.AddonUUID} does not match with ownerID: ${clientAddonUUID}`);
            responseArr.push({
                Key: object.ObjectKey,
                Status: 'Error',
                Details: `Data source AddonUUID: ${object.AddonUUID} does not match with ownerID: ${clientAddonUUID}`
            });
            return false; // Invalid AddonUUID
        }

        if (object.ActionType && !validActionTypes.has(object.ActionType)) {
            console.error(`Invalid ActionType: ${object.ActionType}`);
            responseArr.push({
                Key: object.ObjectKey,
                Status: 'Error',
                Details: `Invalid ActionType: ${object.ActionType}`
            });
            return false;
        }

        return true; // Valid object
    }

    /**
     * Function to stringify and update the NewValue and OldValue
     * @param object 
     */
    formatUpdatedFieldValues(object: AddonData) {
        if (object[`UpdatedFields`]) {
            for (const updatedField of object[`UpdatedFields`]) {
                // if the type of NewValue is object, then stringify it
                if (typeof updatedField.NewValue === 'object') {
                    updatedField.NewValue = JSON.stringify(updatedField.NewValue);
                }
                // if the type of OldValue is object, then stringify it
                if (typeof updatedField.OldValue === 'object') {
                    updatedField.OldValue = JSON.stringify(updatedField.OldValue);
                }
            }
        }
    }

    capitalize(s: string) {
        return s[0].toUpperCase() + s.slice(1);
    }
}