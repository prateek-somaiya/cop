import * as AWS from 'aws-sdk';
declare const awsUtil: {
    fetchComputeOptimizerInstanceRecommendations: (accountIds: string[] | undefined, regions: string[]) => Promise<AWS.ComputeOptimizer.InstanceRecommendation[]>;
    getAllMemberAccounts: (region?: string) => Promise<AWS.Organizations.Account[]>;
};
export default awsUtil;
