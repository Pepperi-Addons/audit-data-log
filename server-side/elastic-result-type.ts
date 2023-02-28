export interface ElasticResultFirstType{
    success: boolean;
    resultObject: InnerElasticResult;
    errorMessage?: undefined;
} 

export interface ElasticResultSecondType{
    success: boolean;
    errorMessage: InnerElasticResult;
    resultObject?: undefined;
}

export interface InnerElasticResult {
        hits: {
            hits: [{
                _source: {
                    AuditInfo: {
                        JobMessageData: {
                            AddonUUID: string
                            FunctionName: string
                            Duration: number
                        }
                    }
                }
            }]
        };
        aggregations: {
            aggragateByAddonUUID: {
                buckets: [{
                    key: string;
                    aggragateByFunctionName: {
                        buckets: [{
                            key: string;
                            durationSum: {
                                value: number
                            }
                        }]
                    }
                }]
            }
        };
    
}