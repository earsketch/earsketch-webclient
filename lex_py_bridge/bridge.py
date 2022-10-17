from pprint import pprint

from flask import Flask, request, jsonify

import requests
import boto3


app = Flask(__name__)

client = boto3.client(
    'lexv2-runtime',
    aws_access_key_id='AKIAQCMZU4SLH3Q2E2OT',
    aws_secret_access_key='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',
    region_name='us-east-1'
)


@app.route("/rasa/tracker")
def rasa_tracker():
    conversation_id = request.args.get("conversation_id")
    resp = requests.get(
        f"{RASA_SERVER_URL}/conversations/{conversation_id}/tracker?token=rasaToken"
    ).json()
    return jsonify(resp)


@app.route("/rasa/webhook", methods=["POST"])
def rasa_webhook():
    resp = requests.post(
        f"{RASA_SERVER_URL}/webhooks/rest/webhook",
        headers={
            "mode": "cors",
            "Content-Type": "application/json",
            "body": requests.json["body"]
        }
    ).json()
    return jsonify(resp)


@app.route("/")
def send_message():
    session_id = request.json["session_id"]
    text = request.json["text"]
    response = client.recognize_text(
        botId='QKH15P7P87',
        botAliasId='2G52T4MCQ0',
        localeId='en_US',
        sessionId=session_id,
        text=text
    )
    pprint(response)


if __name__ == "__main__":
    client.recognize_text(
        botId='QKH15P7P87',
        botAliasId='2G52T4MCQ0',
        localeId='en_US',
        sessionId="test_session",
        text='How do I insert parameters'
    )
    print(dir(client))
    pprint(client.get_session(
        botId='QKH15P7P87',
        botAliasId='2G52T4MCQ0',
        localeId='en_US',
        sessionId="test_session",
    ))
    # app.run(host="0.0.0.0", port=5003)
