import { cleanEnv, port, str } from "envalid";

const validateEnv = () => {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    GEMINI_API_KEY: str(),
    GEMINI_MODEL: str({ default: "gemini-2.0-flash" }),
  });
};

export default validateEnv;
