import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import path from "path";

// The vault path is pulled from your Claude Desktop Config
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;

if (!VAULT_PATH) {
  console.error("Error: OBSIDIAN_VAULT_PATH environment variable is not set.");
  process.exit(1);
}

const server = new Server({
  name: "obsidian-mcp-pro",
  version: "1.2.0",
}, {
  capabilities: { tools: {} },
});

/**
 * Helper: Recursively get all markdown files, ignoring hidden folders like .obsidian or .git
 */
async function getFiles(dir, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (!file.name.startsWith('.')) {
        await getFiles(filePath, fileList);
      }
    } else if (file.name.endsWith('.md')) {
      fileList.push(path.relative(VAULT_PATH, filePath));
    }
  }
  return fileList;
}

/**
 * 1. Define the Toolset
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_notes",
      description: "List all notes in the vault to see the file structure.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "read_note",
      description: "Read the full content of a markdown note.",
      inputSchema: {
        type: "object",
        properties: { 
          relative_path: { type: "string", description: "Path relative to vault (e.g., 'Folder/Note.md')" } 
        },
        required: ["relative_path"]
      }
    },
    {
      name: "search_notes",
      description: "Search for a text string inside all notes in the vault.",
      inputSchema: {
        type: "object",
        properties: { 
          query: { type: "string", description: "The text to search for" } 
        },
        required: ["query"]
      }
    },
    {
      name: "create_note",
      description: "Create a new note or overwrite an existing one with new content.",
      inputSchema: {
        type: "object",
        properties: {
          relative_path: { type: "string", description: "Path including .md" },
          content: { type: "string", description: "The full content of the note" }
        },
        required: ["relative_path", "content"]
      }
    },
    {
      name: "append_note",
      description: "Add text to the end of an existing note without overwriting it.",
      inputSchema: {
        type: "object",
        properties: {
          relative_path: { type: "string" },
          content: { type: "string", description: "The text to add to the bottom" }
        },
        required: ["relative_path", "content"]
      }
    },
    {
      name: "get_backlinks",
      description: "Find all notes that link to a specific note using [[wikilinks]].",
      inputSchema: {
        type: "object",
        properties: {
          note_name: { type: "string", description: "The name of the note without .md (e.g., 'Project Alpha')" }
        },
        required: ["note_name"]
      }
    }
  ]
}));

/**
 * 2. Tool Logic Execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_notes": {
        const files = await getFiles(VAULT_PATH);
        return { content: [{ type: "text", text: files.length > 0 ? files.join("\n") : "Vault is empty or path incorrect." }] };
      }

      case "read_note": {
        const fullPath = path.join(VAULT_PATH, args.relative_path);
        const content = await fs.readFile(fullPath, "utf-8");
        return { content: [{ type: "text", text: content }] };
      }

      case "search_notes": {
        const files = await getFiles(VAULT_PATH);
        const results = [];
        for (const file of files) {
          const content = await fs.readFile(path.join(VAULT_PATH, file), "utf-8");
          if (content.toLowerCase().includes(args.query.toLowerCase())) {
            results.push(file);
          }
        }
        return { content: [{ type: "text", text: results.length > 0 ? `Matches found in:\n${results.join("\n")}` : "No matches found." }] };
      }

      case "create_note": {
        const fullPath = path.join(VAULT_PATH, args.relative_path);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, args.content, "utf-8");
        return { content: [{ type: "text", text: `Successfully saved: ${args.relative_path}` }] };
      }

      case "append_note": {
        const fullPath = path.join(VAULT_PATH, args.relative_path);
        await fs.appendFile(fullPath, `\n${args.content}`, "utf-8");
        return { content: [{ type: "text", text: `Successfully appended to: ${args.relative_path}` }] };
      }

      case "get_backlinks": {
        const files = await getFiles(VAULT_PATH);
        const linkPattern = `[[${args.note_name}]]`;
        const results = [];
        for (const file of files) {
          const content = await fs.readFile(path.join(VAULT_PATH, file), "utf-8");
          if (content.includes(linkPattern)) {
            results.push(file);
          }
        }
        return { content: [{ type: "text", text: results.length > 0 ? `Notes linking to "${args.note_name}":\n${results.join("\n")}` : `No backlinks found for "${args.note_name}".` }] };
      }

      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error) {
    return { 
      content: [{ type: "text", text: `Error: ${error.message}` }], 
      isError: true 
    };
  }
});

/**
 * 3. Start Server
 */
const transport = new StdioServerTransport();
await server.connect(transport);