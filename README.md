# price-watch

## Todo

- [ ] Scraper implementations
  - [x] ebay-kleinanzeigen (TypeScript)
  - [ ] mpb
  - [ ] ebay
  - [ ] rebuy
  - [ ] immoscout
  - [ ] immowelt
- Data Collection: What questions do we need to answer?
  1. For a given product, let me build a price history
  2. For a given product, let me
- [ ] Find a suitable way to organize searches without leaking/manually specifying destination emails
  - We could define `Search`es and define them inside Terraform variables
  - Email addresses could be loaded in via environment variables and aliases or some input file that is not part of the repo
  - Downside: 1 Search == 1 EventBridge schedule
  - Impl: https://stackoverflow.com/questions/78886388/terraform-resource-creation-from-yaml-input-file
- [ ] GitHub Actions CI
  - [x] Setup [OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) so GH can authenticate with AWS
  - [x] pushes to `main` should build Lambdas and plan & apply terraform on dev
  - [ ] pushes to `main` with a tag should build Lambdas and plan & apply terraform on prod
  - [ ] terraform state locking
- [x] AWS Infrastructure via terraform [Readme](./terraform/README.md)
  - [x] terraform State somewhere (S3)
  - [x] have `dev` & `prod` environment
  - [x] Problems with deploying the Lambda
    - I want to use terraform to manage the infrastructure, but the AWS API, and subsequently terraform, requires you to provide a source artefact when creating a Lambda function, either a local file or an S3 key. But when bootstrapping and creating the Lambda function AWS resource, I might not have a source yet, as I want to build the actual code artefact (Lambda layer or ZIP file) as a later step in my CI/CD pipeline.
    - So there seems to be an chicken-and-egg kind of problem, where the philosophy with terraform is to only manage your infrastructure, but the Lambda artefact is required beforehand. Consensus seems to be that for bootstrapping, you need to provide a dummy file or manually build and upload a dummy payload.
    - References:
      - https://www.reddit.com/r/Terraform/comments/xholp8/how_do_you_manage_your_lambda_code_independently/
      - https://www.ensono.com/insights-and-news/expert-opinions/terraform-does-not-need-your-code-to-provision-a-lambda-function/
    - Solution: We set up the Lambda with a dummy zip data archive and use the aws cli to deploy our build artefacts in a later pipeline step
  - [x] GH Pipeline needs to build Lambda package and deploy it
  - [x] S3 bronze bucket for raw scraping data
  - [x] Event Bridge to schedule Lambdas
