import { PapiClient } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';

class PermissionManager {

    papiClient: PapiClient;
    policiesUrl: string = `/policies`;
    profilesUrl: string = `/policy_profiles`;

    static readonly computingTimePolicyName = "computingTime";
    static readonly auditLogPolicyName = "auditLog";

    employeeType = "1"; // admins

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonSecretKey: client.AddonSecretKey,
            addonUUID: client.AddonUUID
        });
    }

    async upsertPermissions(){
        await this.createPolicy(PermissionManager.computingTimePolicyName, "Computing functions running time- grants permissions only for admins");
        await this.createProfile(PermissionManager.computingTimePolicyName);

        await this.createPolicy(PermissionManager.auditLogPolicyName, "Permissions for audit data log GET endpoint");
        await this.createProfile(PermissionManager.auditLogPolicyName);
    }

    async createPolicy(policyName: string, policyDescription: string){
        const body = {
            AddonUUID: this.client.AddonUUID,
            Name: policyName,
            Description: policyDescription
        }
        try{
            console.log(`Going to upsert policy with policyName - ${policyName}`);
            const result = await this.papiClient.post(this.policiesUrl, body);
            console.log(`Policy created successfully, policyName - ${policyName}`);
        } catch(err){
            throw new Error(`Could not upsert policy, error: ${err}`)
        }
    }

    async createProfile(policyName: string){
        const body = {
            PolicyAddonUUID: this.client.AddonUUID,
            PolicyName: policyName,
            ProfileID: this.employeeType,
            Allowed: true
        }
        try{
            console.log(`Going to upsert profile with policyName - ${policyName}`);
            const result = await this.papiClient.post(this.profilesUrl, body);
            console.log(`Profile created successfully, policyName - ${policyName}`);
        } catch(err){
            throw new Error(`Could not upsert profile, error: ${err}`)
        }
    }
}

export default PermissionManager;