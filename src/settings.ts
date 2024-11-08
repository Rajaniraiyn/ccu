import * as vscode from "vscode";

const ANTHROPIC_API_KEY = "ccu.anthropicAPIKey";

export async function storeApiKey(context: vscode.ExtensionContext) {
	const apiKey = await vscode.window.showInputBox({
		prompt: "Enter your API key",
		ignoreFocusOut: true,
		password: true,
	});

	if (apiKey) {
		await context.secrets.store(ANTHROPIC_API_KEY, apiKey);
		vscode.window.showInformationMessage("API key stored securely. Please restart the editor for the key to work properly.");
	} else {
		vscode.window.showErrorMessage("API key input was canceled.");
	}
}

export async function getApiKey(
	context: vscode.ExtensionContext,
): Promise<string | undefined> {
	const apiKey = await context.secrets.get(ANTHROPIC_API_KEY);
	if (!apiKey) {
		vscode.window.showErrorMessage(
			"API key not found. Please set it using 'CCU: Set API Key' command.",
		);
	}
	return apiKey;
}
