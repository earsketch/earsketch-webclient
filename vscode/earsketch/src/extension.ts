import * as vscode from "vscode";

const WS = require('ws');
const PORT = process.env.PORT || 8080;

let listener: vscode.Disposable;
const channel = vscode.window.createOutputChannel("earsketch");

export async function activate(context: vscode.ExtensionContext) {
	let buffer = "";

	const wss = new WS.Server({
		port: PORT
	  }, () => channel.appendLine(`ws server live on ${PORT}`));
	  
	  wss.on('connection', (socket: any) => {
		channel.appendLine('something connected');

		socket.on('message', (data: any) => {
		  channel.appendLine(`socket sent ${data}`);
		});

		listener = vscode.workspace.onDidChangeTextDocument(e => {	
			const text = e.document.getText();

			if (text && buffer !== text) {
                channel.clear();
                channel.replace(text);
                socket.send(text);
                buffer = text;
			}
		});

		// Key Commands: Run, Play
		context.subscriptions.push(vscode.commands.registerCommand("earsketch.runCode", () => socket.send("run")));
		context.subscriptions.push(vscode.commands.registerCommand("earsketch.play", () => socket.send("play")));
	  });
}

export function deactivate() {
	listener.dispose();
}
