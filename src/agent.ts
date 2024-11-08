import vscode from "vscode";
import { anthropic } from "@ai-sdk/anthropic";
import nodePath from "node:path";
import os from "node:os";

function getBasePath(): string | undefined {
  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  } else if (vscode.window.activeTextEditor) {
    return nodePath.dirname(vscode.window.activeTextEditor.document.uri.fsPath);
  } else {
    vscode.window.showErrorMessage(
      "No workspace folder or active editor is open."
    );
    return undefined;
  }
}

export const str_replace_editor = anthropic.tools.textEditor_20241022({
  execute: async ({
    command,
    path,
    file_text,
    insert_line,
    new_str,
    old_str,
    view_range,
  }) => {
    console.log(`Executing command: ${command} on path: ${path}`);

    const basePath = getBasePath();
    if (!basePath) {
      return {
        status: "error",
        message: "No workspace folder or active editor is open.",
      };
    }

    // Handle '~' expansion
    let inputPath = path;
    if (inputPath.startsWith("~")) {
      inputPath = inputPath.replace(/^~(?=$|\/|\\)/, os.homedir());
    }

    // Resolve path relative to the base path
    const resolvedPath = nodePath.resolve(basePath, inputPath);

    // Ensure the resolved path is within the base path
    if (!resolvedPath.startsWith(basePath)) {
      console.error(`Access denied to path: ${resolvedPath}`);
      return {
        status: "error",
        message: `Access to paths outside the workspace is not allowed: ${resolvedPath}`,
      };
    }

    console.log(`Resolved path: ${resolvedPath}`);

    switch (command) {
      case "view": {
        console.log(`Viewing file: ${resolvedPath}`);
        try {
          const fileUri = vscode.Uri.file(resolvedPath);
          const fileData = await vscode.workspace.fs.readFile(fileUri);
          let text = new TextDecoder().decode(fileData);
          if (view_range) {
            const lines = text.split("\n").slice(view_range[0], view_range[1]);
            text = lines.join("\n");
          }
          return {
            status: "success",
            text,
          };
        } catch (error) {
          console.error(`Error viewing file: ${error}`);
          return {
            status: "error",
            message: error instanceof Error ? error.message : error,
          };
        }
      }
      case "create": {
        console.log(`Creating file: ${resolvedPath}`);
        try {
          const fileUri = vscode.Uri.file(resolvedPath);

          // Ensure the parent directory exists
          const parentDir = nodePath.dirname(resolvedPath);
          const parentUri = vscode.Uri.file(parentDir);
          await vscode.workspace.fs.createDirectory(parentUri);

          // Write the file
          const fileData = new TextEncoder().encode(file_text || "");
          await vscode.workspace.fs.writeFile(fileUri, fileData);

          return {
            status: "success",
          };
        } catch (error) {
          console.error(`Error creating file: ${error}`);
          return {
            status: "error",
            message: error instanceof Error ? error.message : error,
          };
        }
      }
      case "str_replace": {
        // Replace text in file
        try {
          const uri = vscode.Uri.file(resolvedPath);
          const fileData = await vscode.workspace.fs.readFile(uri);
          const text = new TextDecoder().decode(fileData);
          const replacedText = text.replace(
            new RegExp(old_str || "", "g"),
            new_str || ""
          );
          await vscode.workspace.fs.writeFile(
            uri,
            new TextEncoder().encode(replacedText)
          );
          return {
            status: "success",
          };
        } catch (error) {
          console.error(error);
          return {
            status: "error",
            message: error instanceof Error ? error.message : error,
          };
        }
      }
      case "insert": {
        // Insert text in file
        try {
          const uri = vscode.Uri.file(resolvedPath);
          const fileData = await vscode.workspace.fs.readFile(uri);
          const text = new TextDecoder().decode(fileData);
          const lines = text.split("\n");
          const position = insert_line || 0;
          lines.splice(position, 0, new_str || "");
          const newText = lines.join("\n");
          await vscode.workspace.fs.writeFile(
            uri,
            new TextEncoder().encode(newText)
          );
          return {
            status: "success",
          };
        } catch (error) {
          console.error(error);
          return {
            status: "error",
            message: error instanceof Error ? error.message : error,
          };
        }
      }
      case "undo_edit": {
        // Undo edit
        try {
          await vscode.commands.executeCommand("undo");
          return {
            status: "success",
          };
        } catch (error) {
          console.error(error);
          return {
            status: "error",
            message: error instanceof Error ? error.message : error,
          };
        }
      }
      default: {
        vscode.window.showErrorMessage("Unknown command");
        return {
          status: "error",
          message: `Unknown command ${command}`,
        };
      }
    }
  },
});

export const bash = anthropic.tools.bash_20241022({
  execute: async ({ command, restart }) => {
    if (restart) {
      // Restart logic
      const existingTerminal = vscode.window.terminals.find(
        (t) => t.name === "ccu-bash"
      );
      if (existingTerminal) {
        existingTerminal.dispose();
      }
      vscode.window.showInformationMessage("Bash Tool restarted.");
      return;
    }

    if (command) {
      // Check for an existing "ccu-bash" terminal or create a new one
      let terminal = vscode.window.terminals.find((t) => t.name === "ccu-bash");
      if (!terminal) {
        terminal = vscode.window.createTerminal("ccu-bash");
      }

      // Focus the terminal and send the command
      terminal.show();
      terminal.sendText(command);

      // return the status success with the terminal output
      return {
        status: "success",
        message: "Command executed",
      };
    }

    vscode.window.showErrorMessage("No command provided.");
  },
});
