"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = __importStar(require("aws-sdk"));
const p_limit_1 = __importDefault(require("p-limit"));
const config_1 = __importDefault(require("./config"));
const limit = p_limit_1.default(config_1.default.maxConcurrency);
const fetchAll = async (instance, operation, params, nextTokenName) => {
    let next;
    let response = [];
    return new Promise(async (resolve, reject) => {
        try {
            do {
                const requestParams = next ? { [nextTokenName]: next } : params;
                const result = await limit(() => instance.makeRequest(operation, requestParams).promise());
                next = result && result[nextTokenName] ? result[nextTokenName] : null;
                response = response.concat(result);
            } while (next);
            resolve(response);
        }
        catch (error) {
            reject(error);
        }
    });
};
const fetchComputeOptimizerRecommendationForAccount = async (account, region) => (await fetchAll(new AWS.ComputeOptimizer({ region: region }), 'getEC2InstanceRecommendations', { accountIds: [account] }, 'nextToken'))
    .filter(e => e.instanceRecommendations != null)
    .flatMap(e => e.instanceRecommendations);
const awsUtil = {
    fetchComputeOptimizerInstanceRecommendations: async (accountIds = [], regions) => (await Promise.allSettled((accountIds && accountIds.length > 0
        ? accountIds
        : (await awsUtil.getAllMemberAccounts()).filter(e => e?.Id != null).map(e => e.Id)).flatMap(async (accountId) => (await Promise.allSettled(regions.flatMap(region => fetchComputeOptimizerRecommendationForAccount(accountId, region))))
        .filter(e => e.status === 'fulfilled')
        .flatMap(e => e.value))))
        .filter(e => e.status === 'fulfilled')
        .flatMap(e => e.value),
    getAllMemberAccounts: async (region = 'us-east-1') => (await fetchAll(new AWS.Organizations({ region }), 'listAccounts', {}, 'NextToken'))
        .filter(e => e.Accounts != null)
        .flatMap(e => e.Accounts)
        .filter(e => e?.Status === 'ACTIVE'),
};
exports.default = awsUtil;
