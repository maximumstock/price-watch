# price-watch

A serverless scraping & notification platform to scan web pages or APIs for changes.

The original idea was to scrape certain e-commerce platforms for new or updates offers of `$interestingThing` and to receive notifications via email while minimizing maintenance effort and leaning as much as possible on AWS services while avoiding services like RDS or EC2 for cost reasons.

What I ended up with is a simple Lambda & Event Bridge setup to run Terraform-managed search queries, keeping a list of seen offers per search query in DynamoDB, sending notification emails via AWS SES and storing the scraped data on S3 in compressed Parquet files for later analytics.

## Architecture

We're running on AWS and use Terraform to manage our infrastructure.

There is a Lambda function for each supported site and one Event Bridge schedule for every search query task which triggers the relevant Lambda function with a payload.
The Lambda payload has the following schema so far:

```ts
export const LambdaInputSchema = z.object({
  searchQuery: z.string().nonempty(),
  notifications: z.array(NotificationSchema),
  rateInMinutes: z.string().nonempty(),
  // In addition to getting notficiations, the scraped data can also be archived for later analytics.
  // Toggling this flag creates a new Parquet file in a managed S3 bucket under `s3a://[bucket]/[lambda-name]/[search-query]`
  storeForAnalytics: z.boolean(),
  analyticsS3Prefix: z.string().nullable().optional(),
});

export const NotificationSchema = z.object({
  type: z.enum(["email"]), // For now only email notifications
  targets: z.array(z.string()).nonempty(),
});
```

Search query tasks are managed via a static `manifest.json` file which is read by the main Terraform module.
An example manifest with a single search query task might look like the following:

```json
{
  "kleinanzeigen": [
    {
      "searchQuery": "s-nikon-z",
      "rateInMinutes": "60",
      "storeForAnalytics": true,
      "notifications": []
    }
  ]
}
```

Above manifest would create a single Event Bridge schedule for the Lambda `kleinanzeigen` to search for `s-nikon-z` (because I'm interested in Nikon Z mount lenses) every 60 minutes. A DynamoDB table stores hashes of seen offers per search query so we can determine what data is new. No notifications will be sent, because this search task is for analytics only, as indicated by `storeForAnalytics: true`, which creates Parquet files of the newly scraped data in a pre-configured S3 bucket. So I can easily use Athena later to look at some price trends for a certain lens for example.

See [Infrastructure](./terraform/README.md) for an overview.

## TODO

- Add Scraper implementations
  - [x] ebay-kleinanzeigen
  - [ ] immoscout
  - [ ] immowelt
  - [ ] mobile.de
  - [ ] autoscout24
  - [ ] ebay
  - [ ] mpb
  - [ ] rebuy
- Add Notification Channels
  - [x] E-Mail
  - [ ] Slack?
  - [ ] Discord?
