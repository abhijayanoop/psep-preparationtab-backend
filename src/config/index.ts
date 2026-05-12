import { config } from "dotenv";
config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === "true";
export const {
  NODE_ENV,
  PORT,
  DB_HOST,
  DB_PORT,
  DB_DATABASE,
  SECRET_KEY,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  AWS_REGION_SONNET,
  AWS_REGION_HAIKU,
  BEDROCK_MODEL_SONNET,
  BEDROCK_MODEL_HAIKU,
} = process.env;
