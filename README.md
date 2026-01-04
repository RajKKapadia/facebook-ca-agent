# Facebook Messenger Webhook Agent

A Node.js/TypeScript server that handles Facebook Messenger webhook events.

## Features

- ✅ Webhook verification endpoint (GET /webhook)
- ✅ Webhook event handler endpoint (POST /webhook)
- ✅ Text message processing
- 🤖 Google Dialogflow CX integration for AI-powered responses
- 💬 Automatic intent detection and response generation
- 📊 Playbook route (POST /playbook) for saving car information to Google Sheets
- 📧 Automated email notifications with car information
- 🚗 Automated data collection and storage

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# API Security
X_API_KEY=your_secret_api_key_here

# Facebook Messenger Configuration
FB_PAGE_ID=your_facebook_page_id
FB_ACCESS_TOKEN=your_page_access_token_here
FB_VERIFY_TOKEN=your_verify_token_here

# Google Dialogflow CX Configuration
CA_PROJECT_ID=your_gcp_project_id
CA_LOCATION=your_agent_location (e.g., us-central1)
CA_AGENT_ID=your_agent_id
SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Google Sheets & Gmail Configuration
GOOGLE_SHEET_ID=your_google_sheet_id
GMAIL_ADDRESS=your_gmail_address
GMAIL_PAASWORD=your_gmail_app_password
```

### 3. Run the Server

Development mode (with hot reload):
```bash
pnpm dev
```

Build and run production:
```bash
pnpm build
pnpm start
```

## Facebook Messenger Setup

### 1. Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the "Messenger" product to your app

### 2. Configure Webhook

1. In your Facebook App dashboard, go to Messenger → Settings
2. In the "Webhooks" section, click "Add Callback URL"
3. Enter your webhook URL: `https://your-domain.com/webhook`
4. Enter your verify token (the same one in your `.env` file)
5. Subscribe to the `messages` webhook field

### 3. Get Page Access Token

1. In Messenger Settings, find "Access Tokens"
2. Select your Facebook Page and generate a token
3. Copy this token to your `.env` file as `FB_ACCESS_TOKEN`

### 4. Setup Google Cloud Services

#### Google Dialogflow CX

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Dialogflow API"
4. Create a Dialogflow CX agent or use an existing one
5. Get your agent details:
   - Project ID: From your GCP project
   - Location: The region where your agent is deployed (e.g., us-central1)
   - Agent ID: From Dialogflow CX agent settings

#### Google Sheets

1. Enable the "Google Sheets API" in your GCP project
2. Create a new Google Sheet or use an existing one
3. Copy the Sheet ID from the URL (the long string in the middle of the URL)
4. Add the following header row to your sheet (Sheet1, Row 1):
   ```
   Timestamp | Name | Mobile | Email | Car Make | Car Model | Car Damage | Car Miles | Car VIN
   ```
5. Share the sheet with your service account email (found in your service account JSON)
   - Give it "Editor" permissions

#### Gmail Setup for Email Notifications

1. Use a Gmail account for sending notifications
2. Enable 2-Factor Authentication on your Google account
3. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password
4. Add to your `.env` file:
   - `GMAIL_ADDRESS`: Your Gmail address
   - `GMAIL_PAASWORD`: The 16-character app password (not your regular password)

#### Service Account

1. In Google Cloud Console, go to "IAM & Admin" → "Service Accounts"
2. Create a new service account with these roles:
   - Dialogflow API Admin
   - (No additional role needed for Sheets if shared directly)
3. Create and download a JSON key for this service account
4. Copy the entire JSON content to your `.env` file as `SERVICE_ACCOUNT_JSON` (as a single-line string)

### 5. Test the Webhook

1. In the Webhooks section, click "Test" to verify the connection
2. Send a message to your Facebook Page
3. Check your server logs to see the received message

## API Endpoints

### POST /playbook

Saves car information to Google Sheets and sends an email notification.

**Authentication:** Requires `x-api-key` header

**Headers:**
```
x-api-key: your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "John Doe",
  "mobile": "+1234567890",
  "email": "john.doe@example.com",
  "carMake": "Toyota",
  "carModel": "Camry",
  "carVIN": "1HGBH41JXMN109186",
  "carDamage": "Front bumper dent",
  "carMiles": "50000"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Data saved successfully",
  "data": {
    "timestamp": "2024-01-04T10:30:00.000Z",
    "name": "John Doe",
    "mobile": "+1234567890",
    "email": "john.doe@example.com",
    "carMake": "Toyota",
    "carModel": "Camry",
    "carVIN": "1HGBH41JXMN109186",
    "carDamage": "Front bumper dent",
    "carMiles": "50000"
  }
}
```

**Response (Error - Missing Fields):**
```json
{
  "error": "Missing required fields",
  "required": ["name", "mobile", "email", "carMake", "carModel", "carVIN", "carDamage", "carMiles"]
}
```

**Response (Error - Missing API Key):**
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "API key is required"
}
```

**Response (Error - Invalid API Key):**
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Invalid API key"
}
```

**Google Sheets Format:**
Data is saved with the following columns:
- Column A: Timestamp
- Column B: Name
- Column C: Mobile
- Column D: Email
- Column E: Car Make
- Column F: Car Model
- Column G: Car Damage
- Column H: Car Miles
- Column I: Car VIN

**Email Notification:**
An email is automatically sent to the configured Gmail address with:
- Customer information (name, mobile, email)
- Car details (make, model, VIN, mileage, damage description)
- Timestamp of submission

### GET /webhook

Webhook verification endpoint used by Facebook to verify your webhook URL.

**Query Parameters:**
- `hub.mode` - Should be "subscribe"
- `hub.verify_token` - Your verification token
- `hub.challenge` - Challenge string to echo back

**Response:**
- `200` with challenge string if verification succeeds
- `403` if verification fails

### POST /webhook

Webhook event handler that receives messages from Facebook Messenger.

**Request Body:**
```json
{
  "object": "page",
  "entry": [
    {
      "messaging": [
        {
          "sender": {
            "id": "USER_PSID"
          },
          "message": {
            "text": "Hello!"
          }
        }
      ]
    }
  ]
}
```

**Response:**
- `200` with "EVENT_RECEIVED" for valid page events
- `404` for non-page events

## Message Handling

The `handleMessage` function processes incoming text messages and integrates with Google Dialogflow CX:

### Flow:
1. Receives text message from Facebook Messenger
2. Creates a unique session ID using the sender's PSID + "-fb-messenger"
3. Sends the message to Dialogflow CX for intent detection (language: English)
4. Receives AI-generated response from Dialogflow
5. Sends the response back to the user via Facebook Messenger

### Session Management
- Session ID format: `{SENDER_PSID}-fb-messenger`
- This ensures each user has their own conversation context
- Dialogflow CX maintains conversation state across messages

### Customization
You can extend the functionality to:
- Add custom error handling
- Implement fallback responses
- Store conversation logs in a database
- Add analytics and monitoring
- Handle rich media responses

## Development

The server logs all incoming webhook events and text messages to the console for debugging purposes.

## License

ISC

