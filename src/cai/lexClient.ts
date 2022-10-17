import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity"
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity"
import { LexRuntimeServiceClient } from "@aws-sdk/client-lex-runtime-service"

const REGION = "us-east-1";

// Create an Amazon Lex service client object.
export const lexClient = new LexRuntimeServiceClient({
    region: REGION,
    credentials: {
        AccessKeyId: "AKIAQCMZU4SLH3Q2E2OT",
        SecretAccessKey: "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"
    }
});
