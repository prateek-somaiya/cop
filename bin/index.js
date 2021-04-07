#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const figlet_1 = __importDefault(require("figlet"));
const ora_1 = __importDefault(require("ora"));
const yargs_1 = __importDefault(require("yargs"));
const fs_1 = __importDefault(require("fs"));
const aws_util_1 = __importDefault(require("./aws-util"));
const xlsx_util_1 = __importDefault(require("./xlsx-util"));
const config_1 = __importDefault(require("./config"));
const getAccounts = async (args) => {
    if (args.accounts && args.accounts.length === 1 && args.accounts[0] === 'all') {
        const spinner = ora_1.default(`Fetching all Organization Accounts`).start();
        try {
            const accounts = (await aws_util_1.default.getAllMemberAccounts()).map(e => e.Id);
            spinner.succeed(`Fetched ${accounts.length} Accounts`);
            return accounts;
        }
        catch (error) {
            spinner.fail('Error in fetching accounts');
            console.log(error);
            process.exit(1);
        }
    }
    return args.accounts;
};
const getRecommendations = async (accounts, regions) => {
    const totalAccounts = accounts.length;
    let done = 0;
    const spinner = ora_1.default(`Fetching Recommendations for ${done}/${totalAccounts} Accounts`).start();
    if (accounts.length > 0) {
        const recommendations = (await Promise.allSettled(accounts.flatMap(async (account) => {
            try {
                const recommendation = await aws_util_1.default.fetchComputeOptimizerInstanceRecommendations([account], regions);
                done++;
                spinner.text = `Fetched Recommendations for ${done}/${totalAccounts} Accounts`;
                return recommendation;
            }
            catch (error) {
                console.log(error);
            }
            return [];
        })))
            .filter(e => e.status === 'fulfilled')
            .flatMap(e => e.value);
        spinner.succeed(`Fetched Recommendations for ${done}/${totalAccounts} Accounts`);
        return recommendations;
    }
    spinner.succeed('No Recommendations to fetch');
    return [];
};
const writeFiles = (recommendations, args) => {
    if (args.excel) {
        const spinner = ora_1.default(`Writing Recommendations to ${args.excel}`).start();
        xlsx_util_1.default.instanceRecommendationsToXlsx(args.excel, recommendations);
        spinner.succeed(`Created ${args.excel}`);
    }
    if (args.json) {
        const spinner = ora_1.default(`Writing Recommendations to ${args.json}`).start();
        fs_1.default.writeFileSync(args.json, JSON.stringify(recommendations));
        spinner.succeed(`Created ${args.json}`);
    }
};
(async () => {
    const banner = figlet_1.default.textSync('cop', { font: 'Doom', horizontalLayout: 'full' });
    console.log(banner);
    console.log('\ncop - Command line utility to generate AWS Compute Optimizer recommendations for multiple AWS Accounts\n');
    const args = yargs_1.default
        .scriptName('cop')
        .usage('Usage: $0 [args]')
        .options({
        accounts: {
            type: 'string',
            array: true,
            demandOption: true,
            alias: 'a',
            desc: 'List of AWS Account IDs, or all',
        },
        regions: {
            type: 'string',
            array: true,
            demandOption: false,
            alias: 'r',
            description: 'List of regions',
            default: ['all'],
            defaultDescription: 'All Regions',
        },
        excel: {
            type: 'string',
            alias: 'x',
            demandOption: false,
            description: 'Output Excel filename',
        },
        json: {
            type: 'string',
            alias: 'j',
            demandOption: false,
            description: 'Output JSON filename',
        },
    })
        .example('$0 -a 123 456 -j test.json', 'Generate the recommendations for accounts 123 and 456 for all regions, write to test.json')
        .example('$0 -r us-east-1 -x test.xlsx', 'Generate the recommendations for all accounts in the Organization for us-east-1 region, write to test.xlsx')
        .example('$0 -a 123 456 -r us-east-1 us-west-2 -x test.xlsx', 'Generate the recommendations for accounts 123 and 456 for us-east-1 and us-west-2 regions, write to test.xlsx')
        .example('$0 -a -j test.json -x test.xlsx', 'Generate the recommendations for all accounts in the Organization for all regions, write to test.json and test.xlsx')
        .help().argv;
    args.regions =
        args.regions && args.regions.length === 1 && args.regions[0] === 'all' ? config_1.default.allRegions : args.regions;
    if (!(args.excel || args.json)) {
        yargs_1.default.showHelp();
        console.log('\nYou need to specify at least one output, either json or excel.');
        process.exit(1);
    }
    const accounts = await getAccounts(args);
    const recommendations = await getRecommendations(accounts, args.regions);
    writeFiles(recommendations, args);
})();
