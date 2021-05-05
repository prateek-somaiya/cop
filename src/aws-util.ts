import * as AWS from 'aws-sdk';
import pLimit from 'p-limit';
import config from './config';

const limit = pLimit(config.maxConcurrency);

const fetchAll = async <T>(
  instance: AWS.Service,
  operation: string,
  params: any,
  nextTokenName: string,
): Promise<T[]> => {
  let next: string;
  let response: T[] = [];

  return new Promise<T[]>(async (resolve, reject) => {
    try {
      do {
        const requestParams: any = next ? { [nextTokenName]: next } : params;
        const result = await limit(() => instance.makeRequest(operation, requestParams).promise());
        next = result && result[nextTokenName] ? result[nextTokenName] : null;
        response = response.concat(result);
      } while (next);

      resolve(response);
    } catch (error) {
      reject(error);
    }
  });
};

const fetchComputeOptimizerInstanceRecommendationForAccount = async (account: string, region: string) =>
  (
    await fetchAll<AWS.ComputeOptimizer.Types.GetEC2InstanceRecommendationsResponse>(
      new AWS.ComputeOptimizer({ region: region }),
      'getEC2InstanceRecommendations',
      { accountIds: [account] },
      'nextToken',
    )
  )
    .filter(e => e.instanceRecommendations != null)
    .flatMap(e => <AWS.ComputeOptimizer.InstanceRecommendations>e.instanceRecommendations);

const fetchComputeOptimizerVolumeRecommendationForAccount = async (account: string, region: string) =>
  (
    await fetchAll<AWS.ComputeOptimizer.Types.GetEBSVolumeRecommendationsResponse>(
      new AWS.ComputeOptimizer({ region: region }),
      'getEBSVolumeRecommendations',
      { accountIds: [account] },
      'nextToken',
    )
  )
    .filter(e => e.volumeRecommendations != null)
    .flatMap(e => <AWS.ComputeOptimizer.VolumeRecommendations>e.volumeRecommendations);

const awsUtil = {
  fetchComputeOptimizerInstanceRecommendations: async (
    accountIds: string[] = [],
    regions: string[],
  ): Promise<AWS.ComputeOptimizer.InstanceRecommendation[]> =>
    (
      await Promise.allSettled(
        (accountIds && accountIds.length > 0
          ? accountIds
          : (await awsUtil.getAllMemberAccounts()).filter(e => e?.Id != null).map(e => <string>e.Id)
        ).flatMap(async accountId =>
          (
            await Promise.allSettled(
              regions.flatMap(region => fetchComputeOptimizerInstanceRecommendationForAccount(accountId, region)),
            )
          )
            .filter(e => e.status === 'fulfilled')
            .flatMap(e => (<PromiseFulfilledResult<AWS.ComputeOptimizer.InstanceRecommendation[]>>e).value),
        ),
      )
    )
      .filter(e => e.status === 'fulfilled')
      .flatMap(e => (<PromiseFulfilledResult<AWS.ComputeOptimizer.InstanceRecommendation[]>>e).value),

  fetchComputeOptimizerVolumeRecommendations: async (
    accountIds: string[] = [],
    regions: string[],
  ): Promise<AWS.ComputeOptimizer.VolumeRecommendation[]> =>
    (
      await Promise.allSettled(
        (accountIds && accountIds.length > 0
          ? accountIds
          : (await awsUtil.getAllMemberAccounts()).filter(e => e?.Id != null).map(e => <string>e.Id)
        ).flatMap(async accountId =>
          (
            await Promise.allSettled(
              regions.flatMap(region => fetchComputeOptimizerVolumeRecommendationForAccount(accountId, region)),
            )
          )
            .filter(e => e.status === 'fulfilled')
            .flatMap(e => (<PromiseFulfilledResult<AWS.ComputeOptimizer.VolumeRecommendation[]>>e).value),
        ),
      )
    )
      .filter(e => e.status === 'fulfilled')
      .flatMap(e => (<PromiseFulfilledResult<AWS.ComputeOptimizer.VolumeRecommendation[]>>e).value),

  getAllMemberAccounts: async (region = 'us-east-1'): Promise<AWS.Organizations.Account[]> =>
    (
      await fetchAll<AWS.Organizations.ListAccountsResponse>(
        new AWS.Organizations({ region }),
        'listAccounts',
        {},
        'NextToken',
      )
    )
      .filter(e => e.Accounts != null)
      .flatMap(e => <AWS.Organizations.Accounts>e.Accounts)
      .filter(e => e?.Status === 'ACTIVE'),
};

export default awsUtil;
