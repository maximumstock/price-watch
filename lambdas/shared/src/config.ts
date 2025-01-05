export interface Configuration {
  awsRegion: string;
  sourceEmail: string;
  analyticsS3Bucket: string;
}

export function readConfigFromEnv(): Configuration {
  const AWS_REGION = process.env.AWS_REGION || "eu-central-1";
  const SOURCE_EMAIL = process.env.SOURCE_EMAIL;
  const ANALYTICS_S3_BUCKET = process.env.ANALYTICS_S3_BUCKET;

  if (!AWS_REGION || !SOURCE_EMAIL || !ANALYTICS_S3_BUCKET) {
    throw new Error(
      "[Error] Missing environment variables: AWS_REGION, SOURCE_EMAIL, ANALYTICS_S3_BUCKET"
    );
  }

  return {
    awsRegion: AWS_REGION,
    sourceEmail: SOURCE_EMAIL,
    analyticsS3Bucket: ANALYTICS_S3_BUCKET,
  };
}
