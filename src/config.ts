import dotenv from "dotenv";  

dotenv.config();

export const PORT = process.env.PORT || 3000;

export const SERVICE_ACCOUNT_JSON = JSON.parse(process.env.SERVICE_ACCOUNT_JSON || "{}");

export const CA_LOCATION = process.env.CA_LOCATION;
export const CA_AGENT_ID = process.env.CA_AGENT_ID;
export const CA_PROJECT_ID = process.env.CA_PROJECT_ID;

export const FB_PAGE_ID = process.env.FB_PAGE_ID;
export const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
export const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

export const X_API_KEY = process.env.X_API_KEY;

export const ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL;
