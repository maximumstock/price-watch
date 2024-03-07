# price-watch

- [/] Terraform setup in GitHub Actions
  - [/] State somewhere (S3, GH Actions itself?)
  - [ ] Pipelines cannot be concurrent
- [/] AWS Infrastructure via Terraform
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
