import dotenv from "dotenv";  

dotenv.config();

export const PORT = process.env.PORT || 3000;

export const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

export const SERVICE_ACCOUNT_JSON = JSON.parse(process.env.SERVICE_ACCOUNT_JSON || "{}");

export const GMAIL_ADDRESS = process.env.GMAIL_ADDRESS;
export const GMAIL_PAASWORD = process.env.GMAIL_PAASWORD;
export const TO_EMAIL = process.env.TO_EMAIL;

export const CA_LOCATION = process.env.CA_LOCATION;
export const CA_AGENT_ID = process.env.CA_AGENT_ID;
export const CA_PROJECT_ID = process.env.CA_PROJECT_ID;

export const FB_PAGE_ID = process.env.FB_PAGE_ID;
export const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
export const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;

export const X_API_KEY = process.env.X_API_KEY;
