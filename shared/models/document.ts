
export interface UpdatedField {
    FieldID: string;
    NewValue: any;
    OldValue: any;
}

export interface Document {
    ActionUUID: string;
    AddonUUID: string,
    ObjectKey: string;
    CreationDateTime: string;
    ObjectModificationDateTime: string;
    UserUUID: string;
    DistributorUUID: string;
    UserEmail?: string;
    ActionType: string;
    Resource: string;
    UpdatedFields: UpdatedField[];
}



