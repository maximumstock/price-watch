export interface Configuration {
  awsRegion: string;
  sourceEmail: string;
}

export function readConfigFromEnv(): Configuration {
  const AWS_REGION = process.env.AWS_REGION || "eu-central-1";
  const SOURCE_EMAIL = process.env.SOURCE_EMAIL;

  if (!AWS_REGION || !SOURCE_EMAIL) {
    throw new Error(
      "[Error] Missing environment variables: AWS_REGION, SOURCE_EMAIL"
    );
  }

  return {
    awsRegion: AWS_REGION,
    sourceEmail: SOURCE_EMAIL,
  };
}
