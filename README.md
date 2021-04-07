# cop

Command line utility to generate AWS Compute Optimizer recommendations for multiple AWS Accounts

# Pre-requisites

- Compute Optimizer should be enabled!
- AWS credentials should be configured in the `~/.aws/credentials` file. See https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- You should have access to Compute Optimizer
- If running from an Organization's management account, make sure Compute Optimizer is enabled at an Organization Level
- This CLI uses the `[default]` credentials

# Installation

`npm i -g prateek-somaiya/cop`

# Usage

`cop [options]`

# Options

```
      --version   Show version number                                  [boolean]
  -a, --accounts  List of AWS Account IDs, or all             [array] [required]
  -r, --regions   List of regions                 [array] [default: All Regions]
  -x, --excel     Output Excel filename                                 [string]
  -j, --json      Output JSON filename                                  [string]
      --help      Show help                                            [boolean]
```

# Examples

| Command                                            | Expected Output                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| cop -a 123 456 -j test.json                        | Generate the recommendations for accounts 123 and 456 for all regions, write to test.json                           |
| cop -r us-east-1 -x test.xlsx                      | Generate the recommendations for all accounts in the Organization for us-east-1 region, write to test.xlsx          |
| cop -a 123 456 -r us-east-1 us-west-2 -x test.xlsx | Generate the recommendations for accounts 123 and 456 for us-east-1 and us-west-2 regions, write to test.xlsx       |
| cop -a -j test.json -x test.xlsx                   | Generate the recommendations for all accounts in the Organization for all regions, write to test.json and test.xlsx |
