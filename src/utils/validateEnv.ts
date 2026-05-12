import { cleanEnv, port, str } from "envalid";

const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    AWS_ACCESS_KEY_ID: str(),
    AWS_SECRET_ACCESS_KEY: str(),
    BEDROCK_MODEL_SONNET: str({
      default: "apac.anthropic.claude-sonnet-4-20250514-v1:0",
    }),
    BEDROCK_MODEL_HAIKU: str({
      default: "us.anthropic.claude-3-haiku-20240307-v1:0",
    }),
    AWS_REGION_SONNET: str({ default: "ap-south-1" }),
    AWS_REGION_HAIKU: str({ default: "us-east-1" }),
  });
};

export default validateEnv;
