export interface PropertyAuditLogHost {
    objectKey: string;
    objectModificationStartTime: string;
    objectModificationEndTime: string;
    property: string;
    title: string;
}

export interface PropertyAuditLogList {
    ClientApplicationType: string;
    CreationDateTime: string;
    ObjectKey: string;
    UpdatedFields: string;
    Email: string;
    User: string;
    ExternalID: string;
    InternalID: string;
    ActionUUID: string;
}