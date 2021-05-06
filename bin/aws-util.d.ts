import * as AWS from 'aws-sdk';
declare const awsUtil: {
    fetchComputeOptimizerInstanceRecommendations: (accountIds: string[] | undefined, regions: string[]) => Promise<AWS.ComputeOptimizer.InstanceRecommendation[]>;
    fetchComputeOptimizerVolumeRecommendations: (accountIds: string[] | undefined, regions: string[]) => Promise<AWS.ComputeOptimizer.VolumeRecommendation[]>;
    getAllMemberAccounts: (region?: string) => Promise<AWS.Organizations.Account[]>;
};
export default awsUtil;
