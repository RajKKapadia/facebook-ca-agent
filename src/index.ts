import express, { Request, Response, NextFunction } from "express";
import { SessionsClient } from "@google-cloud/dialogflow-cx";
import {
    FB_ACCESS_TOKEN,
    FB_VERIFY_TOKEN,
    PORT,
    CA_LOCATION,
    CA_AGENT_ID,
    CA_PROJECT_ID,
    SERVICE_ACCOUNT_JSON,
    X_API_KEY,
    ZAPIER_WEBHOOK_URL
} from "./config";

const app = express();

// Initialize Dialogflow CX Sessions Client
const sessionsClient = new SessionsClient({
    credentials: SERVICE_ACCOUNT_JSON
});

// Middleware to parse JSON bodies
app.use(express.json());

// API Key authentication middleware
const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {

    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "API key is required"
        });
    }

    if (apiKey !== X_API_KEY) {
        return res.status(403).json({
            success: false,
            error: "Forbidden",
            message: "Invalid API key"
        });
    }

    next();
};

app.get("/", (req, res) => {
    res.send("Facebook Messenger Webhook Server");
});

// Playbook route - Send car information to Zapier webhook
app.post("/playbook", apiKeyAuth, async (req: Request, res: Response) => {
    try {
        const { name, mobile, email, carMake, carModel, carVIN, carDamage, carMiles } = req.body;

        // Validate required fields
        if (!name || !mobile || !email || !carMake || !carModel || !carVIN || !carDamage || !carMiles) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["name", "mobile", "email", "carMake", "carModel", "carVIN", "carDamage", "carMiles"]
            });
        }

        // Prepare webhook payload
        const timestamp = new Date().toISOString();
        const webhookPayload = {
            name,
            mobile,
            email,
            carMake,
            carModel,
            carVIN,
            carDamage,
            carMiles,
            timestamp
        };

        // Send data to Zapier webhook
        if (!ZAPIER_WEBHOOK_URL) {
            console.error("ZAPIER_WEBHOOK_URL is not configured");
            return res.status(500).json({
                message: "Webhook URL not configured"
            });
        }

        const webhookResponse = await fetch(ZAPIER_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
            console.error("Zapier webhook error:", await webhookResponse.text());
            return res.status(200).json({
                message: "Failed to send data to webhook"
            });
        }

        console.log("Data sent to Zapier webhook successfully");
        res.status(200).json({
            message: "Data sent successfully"
        });
    } catch (error) {
        console.error("Error sending to Zapier webhook:", error);
        res.status(200).json({
            message: "Failed to send data"
        });
    }
});

// Webhook verification endpoint (GET)
app.get("/webhook", (req: Request, res: Response) => {
    // Parse params from the webhook verification request
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Check if a token and mode were sent
    if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === FB_VERIFY_TOKEN) {
            // Respond with 200 OK and challenge token from the request
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            console.log("WEBHOOK_VERIFICATION_FAILED");
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

// Webhook event handler endpoint (POST)
app.post("/webhook", (req: Request, res: Response) => {
    const body = req.body;

    // Check if this is an event from a page subscription
    if (body.object === "page") {
        // Iterate over each entry - there may be multiple if batched
        body.entry.forEach((entry: any) => {
            // Get the webhook event
            const webhookEvent = entry.messaging[0];

            // Get the sender PSID
            const senderPsid = webhookEvent.sender.id;
            console.log(`Sender PSID: ${senderPsid}`);

            // Check if the event is a message or postback and handle accordingly
            if (webhookEvent.message) {
                handleMessage(senderPsid, webhookEvent.message);
            } else {
                console.log("Event is not a message, ignoring...");
            }
        });

        // Return a '200 OK' response to all events
        res.status(200).send("EVENT_RECEIVED");
    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});

// Handle received messages
async function handleMessage(senderPsid: string, receivedMessage: any) {
    // Check if message contains text
    if (receivedMessage.text) {
        const messageText = receivedMessage.text;
        console.log(`Received text message from ${senderPsid}: "${messageText}"`);

        try {
            // Detect intent using Google Conversational Agent
            const response = await detectIntent(senderPsid, messageText);

            // Send the agent's response back to the user
            if (response) {
                await sendTextMessage(senderPsid, response);
            } else {
                await sendTextMessage(senderPsid, "Sorry, something went wrong. Please try again.");
            }
        } catch (error) {
            console.error("Error processing message with Dialogflow:", error);
            await sendTextMessage(senderPsid, "Sorry, something went wrong. Please try again.");
        }
    } else {
        console.log(`Message from ${senderPsid} does not contain text, ignoring...`);
    }
}

// Detect intent using Google Dialogflow CX
async function detectIntent(recipientId: string, queryText: string): Promise<string> {
    // Create session ID using recipient ID + fixed text
    const sessionId = `${recipientId}-fb-messenger`;
    const sessionPath = sessionsClient.projectLocationAgentSessionPath(
        CA_PROJECT_ID!,
        CA_LOCATION!,
        CA_AGENT_ID!,
        sessionId
    );

    console.log(`Session path: ${sessionPath}`);
    console.log(`Detecting intent for query: "${queryText}"`);

    // Construct the request
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: queryText,
            },
            languageCode: "en", // Language code set to English
        },
    };

    try {
        // Send request to Dialogflow CX
        const [response] = await sessionsClient.detectIntent(request);

        console.log("Dialogflow response received");

        // Extract response messages
        const responseMessages = response.queryResult?.responseMessages || [];

        // Get text responses
        const textResponses = responseMessages
            .filter((message: any) => message.text)
            .map((message: any) => message.text?.text)
            .flat()
            .filter((text: string | undefined) => text);

        if (textResponses.length > 0) {
            const fullResponse = textResponses.join("\n");
            console.log(`Agent response: "${fullResponse}"`);
            return fullResponse;
        }

        console.log("No text response from agent");
        return "";
    } catch (error) {
        console.error("Error calling Dialogflow CX:", error);
        throw error;
    }
}

async function sendTextMessage(recipientId: string, messageText: string) {
    const requestBody = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    try {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/me/messages?access_token=${FB_ACCESS_TOKEN}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            console.error("Error sending message:", await response.text());
        } else {
            console.log("Message sent successfully!");
        }
    } catch (error) {
        console.error("Error sending message:", error);
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
});
