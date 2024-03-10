# price-watch

- [/] GitHub Actions CI
  - [x] Setup [OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) so GH can authenticate with AWS
  - [ ] pushes to `main` should build Lambdas and plan & apply terraform on dev
  - [ ] pushes to `main` with a tag should build Lambdas and plan & apply terraform on prod
  - [ ] terraform state locking
- [/] AWS Infrastructure via terraform
  - [/] terraform State somewhere (S3)
  - Problems with deploying the Lambda
    - I want to use terraform to manage the infrastructure, but the AWS API, and subsequently terraform, requires you to provide a source artefact when creating a Lambda function, either a local file or an S3 key. But when bootstrapping and creating the Lambda function AWS resource, I might not have a source yet, as I want to build the actual code artefact (Lambda layer or ZIP file) as a later step in my CI/CD pipeline.
    - So there seems to be an chicken-and-egg kind of problem, where the philosophy with terraform is to only manage your infrastructure, but the Lambda artefact is required beforehand. Consensus seems to be that for bootstrapping, you need to provide a dummy file or manually build and upload a dummy payload.
    - References:
      - https://www.reddit.com/r/Terraform/comments/xholp8/how_do_you_manage_your_lambda_code_independently/
      - https://www.ensono.com/insights-and-news/expert-opinions/terraform-does-not-need-your-code-to-provision-a-lambda-function/
  - [ ] S3 bucket for raw scraping data
  - [ ] S3 bucket for jobs
  - [ ] Python Lambda
    - what Python version can we use?
    - [ ] GH Pipeline needs to build Lambda package and deploy it
    - [ ] How to do monitoring between CloudWatch & Lambda
  - [ ] Event Bridge to schedule Lambdas
  - [ ] have `dev` & `prod` environment
- [ ] The scraping Python Lambda
  - [ ] Scrape ebay-kleinanzeigen
  - [ ] Scrape mpb
  - [ ] Scrape ebay (optional)
  - [ ] Scrape rebuy (optional)
