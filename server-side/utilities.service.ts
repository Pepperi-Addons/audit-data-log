import { Client, Request } from "@pepperi-addons/debug-server/dist";
import DataRetrievalService from "./data-retrieval.service";
import { AddonData } from "@pepperi-addons/papi-sdk";

export class UtilitiesService {

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




    validateObject(object: AddonData, clientAddonUUID: string, responseArr: any[]): boolean {
        const validSources = new Set(['Android', 'iOS', 'Web']);

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
        if (object.AddonUUID !== clientAddonUUID) {
            console.error(`Data source AddonUUID: ${object.AddonUUID} does not match with ownerID: ${clientAddonUUID}`);
            responseArr.push({
                Key: object.ObjectKey,
                Status: 'Error',
                Details: `Data source AddonUUID: ${object.AddonUUID} does not match with ownerID: ${clientAddonUUID}`
            });
            return false; // Invalid AddonUUID
        }

        return true; // Valid object
    }
}