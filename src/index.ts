#!/usr/bin/env node

import figlet from 'figlet';
import ora from 'ora';
import yargs from 'yargs';
import fs from 'fs';
import awsUtil from './aws-util';
import xlsxUtil from './xlsx-util';
import config from './config';

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

const getRecommendations = async (accounts: string[], regions: string[]) => {
  const totalAccounts = accounts.length;
  let done = 0;
  const spinner = ora(`Fetching Recommendations for ${done}/${totalAccounts} Accounts`).start();

  if (accounts.length > 0) {
    const recommendations = (
      await Promise.allSettled(
        accounts.flatMap(async account => {
          try {
            const recommendation = await awsUtil.fetchComputeOptimizerInstanceRecommendations([account], regions);
            done++;
            spinner.text = `Fetched Recommendations for ${done}/${totalAccounts} Accounts`;
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
    spinner.succeed(`Fetched Recommendations for ${done}/${totalAccounts} Accounts`);
    return recommendations;
  }

  spinner.succeed('No Recommendations to fetch');
  return [];
};

const writeFiles = (recommendations: AWS.ComputeOptimizer.InstanceRecommendation[], args: any) => {
  if (args.excel) {
    const spinner = ora(`Writing Recommendations to ${args.excel}`).start();
    xlsxUtil.instanceRecommendationsToXlsx(args.excel, recommendations);
    spinner.succeed(`Created ${args.excel}`);
  }

  if (args.json) {
    const spinner = ora(`Writing Recommendations to ${args.json}`).start();
    fs.writeFileSync(args.json, JSON.stringify(recommendations));
    spinner.succeed(`Created ${args.json}`);
  }
};

(async () => {
  const banner = figlet.textSync('comop', { font: 'Doom', horizontalLayout: 'full' });
  console.log(banner);
  console.log(
    '\ncomop - command line utility to generate AWS Compute Optimizer recommendations for multiple AWS Accounts\n',
  );

  const args = yargs
    .scriptName('comop')
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
        description: 'Excel filename',
      },
      json: {
        type: 'string',
        alias: 'j',
        demandOption: false,
        description: 'JSON filename',
      },
    })
    .help().argv;

  args.regions =
    args.regions && args.regions.length === 1 && args.regions[0] === 'all' ? config.allRegions : args.regions;

  const accounts = await getAccounts(args);
  const recommendations = await getRecommendations(accounts, args.regions);
  writeFiles(recommendations, args);
})();
