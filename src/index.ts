#!/usr/bin/env node

import figlet from 'figlet';
import ora from 'ora';
import yargs from 'yargs';
import fs from 'fs';
import awsUtil from './aws-util';
import xlsxUtil from './xlsx-util';
import config from './config';

export interface ICopRecommendations {
  iRecommendations?: AWS.ComputeOptimizer.InstanceRecommendation[];
  vRecommendations?: AWS.ComputeOptimizer.VolumeRecommendation[];
}

const getAccounts = async (args: any) => {
  if (args.accounts && args.accounts.length === 1 && args.accounts[0] === 'all') {
    const spinner = ora(`Fetching all Organization Accounts`).start();
    try {
      const accounts = (await awsUtil.getAllMemberAccounts()).map(e => e.Id);
      spinner.succeed(`Fetched ${accounts.length} Accounts`);
      return accounts;
    } catch (error) {
      spinner.fail('Error in fetching accounts');
      console.log(error);
      process.exit(1);
    }
  }

  return args.accounts;
};

const getInstanceRecommendations = async (accounts: string[], regions: string[]) => {
  const totalAccounts = accounts.length;
  let done = 0;
  const spinner = ora(`Fetching Instance Recommendations for ${done}/${totalAccounts} Accounts`).start();

  if (accounts.length > 0) {
    const recommendations = (
      await Promise.allSettled(
        accounts.flatMap(async account => {
          try {
            const recommendation = await awsUtil.fetchComputeOptimizerInstanceRecommendations([account], regions);
            done++;
            spinner.text = `Fetched Instance Recommendations for ${done}/${totalAccounts} Accounts`;
            return recommendation;
          } catch (error) {
            console.log(error);
          }
          return [];
        }),
      )
    )
      .filter(e => e.status === 'fulfilled')
      .flatMap(e => (<PromiseFulfilledResult<AWS.ComputeOptimizer.InstanceRecommendation[]>>e).value);
    spinner.succeed(`Fetched Instance Recommendations for ${done}/${totalAccounts} Accounts`);
    return recommendations;
  }

  spinner.succeed('No Recommendations to fetch');
  return [];
};

const getVolumeRecommendations = async (accounts: string[], regions: string[]) => {
  const totalAccounts = accounts.length;
  let done = 0;
  const spinner = ora(`Fetching Volume Recommendations for ${done}/${totalAccounts} Accounts`).start();

  if (accounts.length > 0) {
    const recommendations = (
      await Promise.allSettled(
        accounts.flatMap(async account => {
          try {
            const recommendation = await awsUtil.fetchComputeOptimizerVolumeRecommendations([account], regions);
            done++;
            spinner.text = `Fetched Volume Recommendations for ${done}/${totalAccounts} Accounts`;
            return recommendation;
          } catch (error) {
            console.log(error);
          }
          return [];
        }),
      )
    )
      .filter(e => e.status === 'fulfilled')
      .flatMap(e => (<PromiseFulfilledResult<AWS.ComputeOptimizer.VolumeRecommendation[]>>e).value);
    spinner.succeed(`Fetched Volume Recommendations for ${done}/${totalAccounts} Accounts`);
    return recommendations;
  }

  spinner.succeed('No Recommendations to fetch');
  return [];
};

const getRecommendations = async (accounts: string[], regions: string[]) => ({
  iRecommendations: await getInstanceRecommendations(accounts, regions),
  vRecommendations: await getVolumeRecommendations(accounts, regions),
});

const writeFiles = (recommendations: ICopRecommendations, args: any) => {
  if (args.excel) {
    const spinner = ora(`Writing Recommendations to ${args.excel}`).start();
    xlsxUtil.recommendationsToXlsx(args.excel, recommendations);
    spinner.succeed(`Created ${args.excel}`);
  }

  if (args.json) {
    const spinner = ora(`Writing Recommendations to ${args.json}`).start();
    fs.writeFileSync(args.json, JSON.stringify(recommendations));
    spinner.succeed(`Created ${args.json}`);
  }
};

(async () => {
  const banner = figlet.textSync('cop', { font: 'Doom', horizontalLayout: 'full' });
  console.log(banner);
  console.log(
    '\ncop - Command line utility to generate AWS Compute Optimizer recommendations for multiple AWS Accounts\n',
  );

  const args = yargs
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
    .example(
      '$0 -a 123 456 -j test.json',
      'Generate the recommendations for accounts 123 and 456 for all regions, write to test.json',
    )
    .example(
      '$0 -r us-east-1 -x test.xlsx',
      'Generate the recommendations for all accounts in the Organization for us-east-1 region, write to test.xlsx',
    )
    .example(
      '$0 -a 123 456 -r us-east-1 us-west-2 -x test.xlsx',
      'Generate the recommendations for accounts 123 and 456 for us-east-1 and us-west-2 regions, write to test.xlsx',
    )
    .example(
      '$0 -a -j test.json -x test.xlsx',
      'Generate the recommendations for all accounts in the Organization for all regions, write to test.json and test.xlsx',
    )
    .help().argv;

  args.regions =
    args.regions && args.regions.length === 1 && args.regions[0] === 'all' ? config.allRegions : args.regions;

  args.accounts = args.accounts && args.accounts.length === 0 ? ['all'] : args.accounts;

  if (!(args.excel || args.json)) {
    yargs.showHelp();
    console.log('\nYou need to specify at least one output, either json or excel.');
    process.exit(1);
  }

  const accounts = await getAccounts(args);
  const recommendations = await getRecommendations(accounts, args.regions);
  writeFiles(recommendations, args);
})();
