import { PapiClient } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';

class PermissionManager {

    papiClient: PapiClient;
    policyName = "computingTime";
    employeeType = "1";

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonSecretKey: client.AddonSecretKey,
            addonUUID: client.AddonUUID
        });
    }

    async upsertPermissions(){
        await this.upsertPolicy();
        await this.upsertProfile();
    }

    async upsertProfile(){
        const url: string = `/policy_profiles`;
        const body = {
            PolicyAddonUUID: this.client.AddonUUID,
            PolicyName: this.policyName,
            ProfileID: this.employeeType,
            Allowed: true
        }
        try{
            console.log(`Going to upsert profile with policyName - ${this.policyName}`);
            const result = await this.papiClient.post(url, body);
            console.log(`Succeeded upsert profile with policyName - ${this.policyName}`);
        } catch(err){
            throw new Error(`Could not upsert profile, error: ${err}`)
        }
    }

    async upsertPolicy(){
        const url: string = `/policies`;
        const body = {
            AddonUUID: this.client.AddonUUID,
            Name: this.policyName,
            Description: "Grants permissions only for admins"
        }
        try{
            console.log(`Going to upsert policy with policyName - ${this.policyName}`);
            const result = await this.papiClient.post(url, body);
            console.log(`Succeeded upsert policy with policyName - ${this.policyName}`);
        } catch(err){
            throw new Error(`Could not upsert policy, error: ${err}`)
        }
    }
}

export default PermissionManager;