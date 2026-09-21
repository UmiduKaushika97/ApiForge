// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "apiforge" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand(
		'apiforge.helloWorld', () => {
		const panel = vscode.window.createWebviewPanel(
                "apifroge",
                "ApiFroge",
				 vscode.ViewColumn.One,
				 {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
			);
			panel.webview.html = getWebviewContent(panel.webview);
		// vscode.window.showInformationMessage('Hello World from ApiForge!');
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(webview: vscode.Webview): string {

return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <meta
                http-equiv="Content-Security-Policy"
                content="
                    default-src 'none';
                    img-src ${webview.cspSource} https:;
                    script-src 'unsafe-inline';
                    style-src ${webview.cspSource} 'unsafe-inline';
                "
            />

            <title>ApiFroge</title>
        </head>

        <body>
            <div id="root"></div>

            <script>
                const vscode = acquireVsCodeApi();

                window.vscode = vscode;
            </script>

            <script src="WEBVIEW_SCRIPT"></script>
        </body>
        </html>
    `;
}

// This method is called when your extension is deactivated
export function deactivate() {}
