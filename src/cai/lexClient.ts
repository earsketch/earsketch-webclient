import { LexRuntimeV2Client } from "@aws-sdk/client-lex-runtime-v2"

const REGION = "us-east-1"
const AWS = require("aws-sdk")

// Create an Amazon Lex service client object.
export const lexClient = new LexRuntimeV2Client({
    region: REGION,
    credentials: new AWS.Credentials(
        "AKIAQCMZU4SLH3Q2E2OT",
        "kqWR7LAZ5cccz5tNTahoLDr98o1vSuF2yZK5HpYD"
    ),
})
