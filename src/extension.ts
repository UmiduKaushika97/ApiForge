
import * as vscode from "vscode";
import * as path from "node:path";

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequest {
  id: string;
  name: string;
  method: ApiMethod;
  url: string;
  headers: string;
  body: string;
}

interface ApiResult {
  status: number;
  statusText: string;
  duration: number;
  headers: Record<string, string>;
  body: string;
}

interface WebviewMessage {
  type: string;
  request?: ApiRequest;
  id?: string;
}

class ApiFrogeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "apifroge.requestView";

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, "media"))
      ]
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        const webview = webviewView.webview;

        try {
          switch (message.type) {
            case "getCollections": {
              const requests =
                this.context.globalState.get<ApiRequest[]>(
                  "apifroge.requests",
                  []
                );

              await webview.postMessage({
                type: "collections",
                requests
              });
              break;
            }

            case "saveRequest": {
              if (!message.request) {
                throw new Error("Missing request data.");
              }

              const requests =
                this.context.globalState.get<ApiRequest[]>(
                  "apifroge.requests",
                  []
                );

              const next = [
                ...requests.filter(
                  (item) => item.id !== message.request!.id
                ),
                message.request
              ];

              await this.context.globalState.update(
                "apifroge.requests",
                next
              );

              await webview.postMessage({
                type: "collections",
                requests: next
              });
              break;
            }

            case "deleteRequest": {
              if (!message.id) {
                throw new Error("Missing request ID.");
              }

              const requests =
                this.context.globalState.get<ApiRequest[]>(
                  "apifroge.requests",
                  []
                );

              const next = requests.filter(
                (item) => item.id !== message.id
              );

              await this.context.globalState.update(
                "apifroge.requests",
                next
              );

              await webview.postMessage({
                type: "collections",
                requests: next
              });
              break;
            }

            case "sendRequest": {
              if (!message.request) {
                throw new Error("Missing request data.");
              }

              const result = await this.sendRequest(message.request);

              await webview.postMessage({
                type: "response",
                result
              });
              break;
            }

            case "newRequest": {
              await webview.postMessage({
                type: "newRequest"
              });
              break;
            }
          }
        } catch (error: unknown) {
          await webview.postMessage({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred."
          });
        }
      }
    );
  }

  private async sendRequest(
    request: ApiRequest
  ): Promise<ApiResult> {
    const url = request.url.trim();

    if (!url) {
      throw new Error("Enter a request URL.");
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error("Enter a valid URL, including https:// or http://.");
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP and HTTPS requests are supported.");
    }

    let headers: Record<string, string> = {};

    try {
      headers = JSON.parse(request.headers || "{}") as Record<
        string,
        string
      >;
    } catch {
      throw new Error("Headers must be valid JSON.");
    }

    if (
      !headers ||
      typeof headers !== "object" ||
      Array.isArray(headers)
    ) {
      throw new Error("Headers must be a JSON object.");
    }

    const method = request.method;
    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(30000),
      redirect: "follow"
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      if (request.body.trim()) {
        try {
          JSON.parse(request.body);
        } catch {
          throw new Error("Request body must contain valid JSON.");
        }

        const hasContentType = Object.keys(headers).some(
          (key) => key.toLowerCase() === "content-type"
        );

        if (!hasContentType) {
          headers["Content-Type"] = "application/json";
        }

        options.headers = headers;
        options.body = request.body;
      }
    }

    const start = Date.now();
    const response = await fetch(parsedUrl, options);
    const duration = Date.now() - start;

    const responseHeaders: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const body = await response.text();

    let formattedBody = body;

    try {
      formattedBody = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      // Preserve text, HTML and other non-JSON responses.
    }

    return {
      status: response.status,
      statusText: response.statusText,
      duration,
      headers: responseHeaders,
      body: formattedBody
    };
  }

  private getHtml(webview: vscode.Webview): string {
    const indexPath = vscode.Uri.file(
      path.join(this.context.extensionPath, "media/webview/index.html")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "media/webview/assets")
      )
    );

    const nonce = [...Array(32)]
      .map(() => Math.random().toString(36).charAt(2))
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy"
 content="default-src 'none'; img-src ${webview.cspSource} https: data:;
 style-src ${webview.cspSource} 'unsafe-inline';
 script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, "media/webview/assets/index.css")
      )
    )}">
<title>ApiFroge</title>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" type="module" src="${scriptUri}/index.js"></script>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new ApiFrogeViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ApiFrogeViewProvider.viewType,
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("apifroge.open", async () => {
      await vscode.commands.executeCommand(
        "workbench.view.extension.apifroge"
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("apifroge.newRequest", async () => {
      await vscode.commands.executeCommand(
        "apifroge.requestView.focus"
      );
    })
  );
}

export function deactivate(): void {}
