import * as vscode from "vscode";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { bash, str_replace_editor } from "./agent";
import { getApiKey, storeApiKey } from "./settings";

export async function activate(context: vscode.ExtensionContext) {
	console.log("Activating CCU extension");

	// Register the command to set the anthropic API key
	const setAnthropicApiKeyCommand = vscode.commands.registerCommand(
		"ccu.setAnthropicApiKey",
		() => storeApiKey(context),
	);

	console.log("Command to set API key registered");

	const apiKey = process.env.ANTHROPIC_API_KEY || (await getApiKey(context));
	if (!apiKey) {
		vscode.window.showErrorMessage(
			"Anthropic API key not found. Please set it first.",
		);
		return;
	}

	console.log("API key found");

	const anthropic = createAnthropic({
		apiKey,
	});

	console.log("Anthropic client created");

	// Register the command to run the agent
	const runGenerateTextCommand = vscode.commands.registerCommand(
		"ccu.runAgent",
		async () => {
			// Show input box to get user prompt
			const userPrompt = await vscode.window.showInputBox({
				prompt: "Enter your prompt for Claude:",
				placeHolder: "e.g., Build me a tic-tac-toe game",
			});

			if (!userPrompt) {
				vscode.window.showErrorMessage("Prompt cannot be empty.");
				return;
			}

			// Enhanced system prompt
			const systemPrompt = `
You are an advanced AI agent operating within VSCode. Your primary functions include:

- Manipulating files and code within the editor.
- Executing shell commands via the integrated terminal.
- Interacting with the user through the dedicated UI panel.

As an AI agent, you should:

- Carefully analyze user requests and plan your actions accordingly.
- Use available tools to perform tasks, including "bash" for executing shell commands and "str_replace_editor" for file manipulations.
- Ensure that any changes you make are correct and safe.
- When necessary, ask the user for clarification.

make sure to give paths w.r.t home dir or current dir, so it should be like ~/** or ./**

Remember to provide clear and concise outputs.
`;

			// Call the generateText function
			try {
				const result = await generateText({
					model: anthropic("claude-3-5-sonnet-20241022", {
						cacheControl: true,
					}),
					system: systemPrompt,
					prompt: userPrompt,
					maxSteps: 10,
					tools: { bash, str_replace_editor },
				});

				console.log(result);
				vscode.window.showInformationMessage(
					"Text generation completed. Check the console for details.",
				);
			} catch (error) {
				console.error(error);
				vscode.window.showErrorMessage(
					`Error during text generation: ${
						error instanceof Error ? error.message : error
					}`,
				);
			}
		},
	);

	console.log("Command to run agent registered");

	context.subscriptions.push(runGenerateTextCommand, setAnthropicApiKeyCommand);
}

export function deactivate() {}
