import { AddonAPIService, BaseTest, LocalAddonAPIService, ServicesContainer } from "@pepperi-addons/addon-testing-framework";
import { AddonUUID } from "../../addon.config.json";
import { utilitiesService } from "../api";
import sinon from 'sinon';
import { RESOURCE_CHUNK_SIZE, VALID_SOURCES } from "../entities";

const mockObject = {
    "Source": "Web",
    "ActionUUID": "8825e6f4-b47f-4f45-9545-89fc65769e05",
    "ActionType": "insert",
    "ObjectKey": "98a7a422-a0a7-4333-9c30-67bca8f3ea4d",
    "ObjectModificationDateTime": "2024-10-07T14:59:48Z",
    "AddonUUID": "00000000-0000-0000-0000-00000da1a109",
    "Resource": "MyTasks",
    "UpdatedFields": [
        {
            "FieldID": "Status",
            "NewValue": "4",
            "OldValue": "3"
        }
    ]

}
export class AuditDataLogTests extends BaseTest {
    title = 'Audit Data Log Tests';
    apiService!: AddonAPIService;
    init(container: ServicesContainer): void {
        this.apiService = container.get(AddonAPIService, LocalAddonAPIService);
        this.apiService.addonUUID = AddonUUID;
    }

    extractBodyMessage(errorString) {
        // Use a regular expression to extract the body JSON
        const bodyMatch = errorString.match(/body:\s*(\{.*\})/);
        let bodyMessage;

        if (bodyMatch) {
            // Parse the JSON string
            const body = JSON.parse(bodyMatch[1]);
            // Get the message from the parsed body
            bodyMessage = body.message;
        }
        return bodyMessage;
    }

    tests(describe: (suiteTitle: string, func: () => void) => void, it: (name: string, fn: Mocha.Func) => void, expect: Chai.ExpectStatic): void {
        describe('upsert_audit_data_logs', () => {
            describe('Check for body validations', () => {
                it("Only POST request allowed", async () => {
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    try {
                        await this.apiService.get('api/upsert_audit_data_logs', {})
                    } catch (error) {
                        const message = this.extractBodyMessage((error as Error).message);
                        expect(message).to.equal("This operation is only available in POST")
                    }
                    validateOwnerStub.restore(); // Restore after the test

                })


                it("validate secret key and owner id", async () => {
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').rejects(new Error("Failed to verify secret key"));
                    try {
                        await this.apiService.post('api/upsert_audit_data_logs', {})
                    } catch (error) {
                        const message = this.extractBodyMessage((error as Error).message);
                        expect(message).to.equal("Failed to verify secret key");
                       
                    }
                    validateOwnerStub.restore(); // Restore after the test

                })

                it('Objects is mandatory and cannot be empty', async () => {
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();

                    try {
                        await this.apiService.post('api/upsert_audit_data_logs', {})
                    } catch (error) {
                        const message = this.extractBodyMessage((error as Error).message);
                        expect(message).to.equal("Objects array is mandatory and must not be empty")
                    }

                    try {
                        await this.apiService.post('api/upsert_audit_data_logs', { Objects: [] });
                    } catch (error) {
                        const message = this.extractBodyMessage((error as Error).message);
                        expect(message).to.equal("Objects array is mandatory and must not be empty")
                    }
                    validateOwnerStub.restore(); // Restore after the test

                });

                it('Objects length must not be more than RESOURCE_CHUNK_SIZE', async () => {
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    try {
                        await this.apiService.post('api/upsert_audit_data_logs', { Objects: new Array(501) });
                    } catch (error) {
                        const message = this.extractBodyMessage((error as Error).message);
                        expect(message).to.equal(`Objects array can contain at most ${RESOURCE_CHUNK_SIZE} objects`)
                    }
                    validateOwnerStub.restore(); // Restore after the test

                });

                it('Validate object source', async () => {
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await this.apiService.post('api/upsert_audit_data_logs', { Objects: [{ Source: "Test" }] });
                    expect(response[0].Details).to.equal('Invalid Source: Test');
                    validateOwnerStub.restore(); // Restore after the test
                });

                it('Validate object AddonUUID', async () => {
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await await this.apiService.post('api/upsert_audit_data_logs', {
                        Objects: [{
                            Source: VALID_SOURCES[0],
                            AddonUUID: "123"
                        }]
                    })
                    expect(response[0].Details).to.equal(`Data source AddonUUID: 123 does not match with ownerID: ${AddonUUID}`);
                    validateOwnerStub.restore(); // Restore after the test
                });

                it('Validate object ActionType', async () => {
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await this.apiService.post('api/upsert_audit_data_logs', {
                        Objects: [
                            {
                                Source: VALID_SOURCES[0],
                                AddonUUID,
                                ActionType: 'Delete'
                            }
                        ]
                    })
                    expect(response[0].Details).to.equal(`Invalid ActionType: Delete`)
                    validateOwnerStub.restore(); // Restore after the test
                });



            });

            describe("Successfully upsert the data", () => {
                it("upsert audit log data into elastic search", async () => {
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await this.apiService.post('api/upsert_audit_data_logs', {
                        Objects: [
                            { ...mockObject }
                        ]
                    })
                    expect(response[0].Key).to.equal("98a7a422-a0a7-4333-9c30-67bca8f3ea4d");
                    expect(response[0].Status).to.equal("Created");
                    validateOwnerStub.restore(); // Restore after the test

                })
            })
        });
    }

}