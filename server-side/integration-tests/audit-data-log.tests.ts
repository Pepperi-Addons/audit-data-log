import { AddonAPIService, BaseTest, LocalAddonAPIService, ServicesContainer } from "@pepperi-addons/addon-testing-framework";
import { AddonUUID } from "../../addon.config.json";
import { utilitiesService, helper } from "../api";
import sinon from 'sinon';
import { RESOURCE_CHUNK_SIZE, VALID_SOURCES } from "../entities";
import { MOCK_OWNER_ID, UPSERT_ERROR_PAYLOAD, UPSERT_SUCCESS_PAYLOAD } from "../data/audit-logs.mock";

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

                });

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
                    let helperStub = sinon.stub(helper, 'normalizeHeaders').returns({
                        "x-pepperi-ownerid": MOCK_OWNER_ID
                    });
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await this.apiService.post('api/upsert_audit_data_logs', { Objects: [{ Source: "Test" }] });
                    expect(response[0].Details).to.equal('Invalid Source: Test');
                    validateOwnerStub.restore(); // Restore after the test
                    helperStub.restore();
                });

                it('Validate object AddonUUID', async () => {
                    let helperStub = sinon.stub(helper, 'normalizeHeaders').returns({
                        "x-pepperi-ownerid": MOCK_OWNER_ID
                    });
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await await this.apiService.post('api/upsert_audit_data_logs', {
                        Objects: [{
                            Source: VALID_SOURCES[0],
                            AddonUUID: "123"
                        }]
                    })
                    expect(response[0].Details).to.equal(`Data source AddonUUID: 123 does not match with ownerID: ${MOCK_OWNER_ID}`);
                    validateOwnerStub.restore(); // Restore after the test
                    helperStub.restore();
                });

                it('Validate object ActionType', async () => {
                    let helperStub = sinon.stub(helper, 'normalizeHeaders').returns({
                        "x-pepperi-ownerid": MOCK_OWNER_ID
                    });
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await this.apiService.post('api/upsert_audit_data_logs', {
                        Objects: [
                            {
                                Source: VALID_SOURCES[0],
                                AddonUUID: MOCK_OWNER_ID,
                                ActionType: 'Delete'
                            }
                        ]
                    })
                    expect(response[0].Details).to.equal(`Invalid ActionType: Delete`)
                    validateOwnerStub.restore(); // Restore after the test
                    helperStub.restore();
                });
            });

            describe("Successfully upsert the data", () => {
                it("upsert audit log data into elastic search", async () => {
                    let helperStub = sinon.stub(helper, 'normalizeHeaders').returns({
                        "x-pepperi-ownerid": MOCK_OWNER_ID
                    });
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await this.apiService.post('api/upsert_audit_data_logs', {
                        Objects: [
                            ...UPSERT_SUCCESS_PAYLOAD
                        ]
                    });
                    expect(response.length).to.equal(2);
                    expect(response[0].Status).to.equal("Created");
                    expect(response[1].Status).to.equal("Created");
                    validateOwnerStub.restore(); // Restore after the test
                    helperStub.restore();
                })
            })

            describe("Should fail one object and upsert the one object data", () => {
                it("upsert audit log data into elastic search", async () => {
                    let helperStub = sinon.stub(helper, 'normalizeHeaders').returns({
                        "x-pepperi-ownerid": MOCK_OWNER_ID
                    });
                    let validateOwnerStub = sinon.stub(utilitiesService, 'validateOwner').resolves();
                    const response = await this.apiService.post('api/upsert_audit_data_logs', {
                        Objects: [
                            ...UPSERT_ERROR_PAYLOAD
                        ]
                    });
                    expect(response.length).to.equal(2);
                    expect(response[0].Status).to.equal("Error");
                    expect(response[0].Details).to.equal(`Data source AddonUUID: ${UPSERT_ERROR_PAYLOAD[1].AddonUUID} does not match with ownerID: ${MOCK_OWNER_ID}`);
                    expect(response[1].Status).to.equal("Created");
                    validateOwnerStub.restore(); // Restore after the test
                    helperStub.restore();
                })
            })
        });
    }

}