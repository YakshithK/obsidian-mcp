import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import path from "path";

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;

if (!VAULT_PATH) {
  console.error("Error: OBSIDIAN_VAULT_PATH is not set.");
  process.exit(1);
}

const server = new Server({
  name: "obsidian-mcp-ultimate",
  version: "1.4.0",
}, {
  capabilities: { tools: {} },
});

// --- Helpers ---

async function getFiles(dir, fileList = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (!file.name.startsWith('.')) await getFiles(filePath, fileList);
    } else if (file.name.endsWith('.md')) {
      fileList.push(path.relative(VAULT_PATH, filePath));
    }
  }
  return fileList;
}

// --- Tool Definitions ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "list_notes", description: "List all notes recursively.", inputSchema: { type: "object", properties: {} } },
    { name: "read_note", description: "Read a note's full content.", inputSchema: { type: "object", properties: { relative_path: { type: "string" } }, required: ["relative_path"] } },
    { name: "search_notes", description: "Search for text in all notes.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    { name: "create_note", description: "Create or overwrite a note.", inputSchema: { type: "object", properties: { relative_path: { type: "string" }, content: { type: "string" } }, required: ["relative_path", "content"] } },
    { name: "append_note", description: "Append text to the end of a note.", inputSchema: { type: "object", properties: { relative_path: { type: "string" }, content: { type: "string" } }, required: ["relative_path", "content"] } },
    {
      name: "insert_content",
      description: "Insert text at a specific line or after a specific anchor string (like a header).",
      inputSchema: {
        type: "object",
        properties: {
          relative_path: { type: "string" },
          content_to_insert: { type: "string" },
          line_number: { type: "number", description: "Line number (1-indexed)" },
          after_text: { type: "string", description: "Text to find and insert directly after" }
        },
        required: ["relative_path", "content_to_insert"]
      }
    },
    {
      name: "patch_note",
      description: "Find and replace a specific string within a note.",
      inputSchema: {
        type: "object",
        properties: {
          relative_path: { type: "string" },
          find: { type: "string", description: "The exact text to find" },
          replace: { type: "string", description: "The text to replace it with" }
        },
        required: ["relative_path", "find", "replace"]
      }
    },
    {
      name: "delete_note",
      description: "Permanently delete a note.",
      inputSchema: { type: "object", properties: { relative_path: { type: "string" } }, required: ["relative_path"] }
    },
    {
      name: "move_note",
      description: "Rename or move a file/folder.",
      inputSchema: {
        type: "object",
        properties: {
          old_path: { type: "string" },
          new_path: { type: "string" }
        },
        required: ["old_path", "new_path"]
      }
    },
    {
      name: "create_directory",
      description: "Create a new folder (recursive).",
      inputSchema: { type: "object", properties: { directory_path: { type: "string" } }, required: ["directory_path"] }
    },
    {
      name: "get_metadata",
      description: "Extract YAML frontmatter properties from a note.",
      inputSchema: { type: "object", properties: { relative_path: { type: "string" } }, required: ["relative_path"] }
    },
    {
      name: "resolve_link",
      description: "Convert an Obsidian [[wikilink]] into a relative file path.",
      inputSchema: { type: "object", properties: { link_text: { type: "string", description: "The text inside the brackets" } }, required: ["link_text"] }
    }
  ]
}));

// --- Implementation ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "list_notes": {
        const files = await getFiles(VAULT_PATH);
        return { content: [{ type: "text", text: files.join("\n") }] };
      }

      case "read_note": {
        const content = await fs.readFile(path.join(VAULT_PATH, args.relative_path), "utf-8");
        return { content: [{ type: "text", text: content }] };
      }

      case "insert_content": {
        const fullPath = path.join(VAULT_PATH, args.relative_path);
        const data = await fs.readFile(fullPath, "utf-8");
        let lines = data.split(/\r?\n/);
        let targetIndex = -1;

        if (args.line_number) {
          targetIndex = Math.max(0, Math.min(args.line_number - 1, lines.length));
        } else if (args.after_text) {
          const idx = lines.findIndex(line => line.includes(args.after_text));
          if (idx !== -1) targetIndex = idx + 1;
        }

        if (targetIndex === -1) lines.push(args.content_to_insert);
        else lines.splice(targetIndex, 0, args.content_to_insert);

        await fs.writeFile(fullPath, lines.join("\n"), "utf-8");
        return { content: [{ type: "text", text: `Successfully inserted content into ${args.relative_path}` }] };
      }

      case "patch_note": {
        const fullPath = path.join(VAULT_PATH, args.relative_path);
        const content = await fs.readFile(fullPath, "utf-8");
        if (!content.includes(args.find)) throw new Error("Target text not found in note.");
        const newContent = content.replace(args.find, args.replace);
        await fs.writeFile(fullPath, newContent, "utf-8");
        return { content: [{ type: "text", text: `Successfully patched ${args.relative_path}` }] };
      }

      case "delete_note": {
        await fs.unlink(path.join(VAULT_PATH, args.relative_path));
        return { content: [{ type: "text", text: `Deleted ${args.relative_path}` }] };
      }

      case "move_note": {
        const oldP = path.join(VAULT_PATH, args.old_path);
        const newP = path.join(VAULT_PATH, args.new_path);
        await fs.mkdir(path.dirname(newP), { recursive: true });
        await fs.rename(oldP, newP);
        return { content: [{ type: "text", text: `Moved to ${args.new_path}` }] };
      }

      case "create_directory": {
        await fs.mkdir(path.join(VAULT_PATH, args.directory_path), { recursive: true });
        return { content: [{ type: "text", text: `Created directory ${args.directory_path}` }] };
      }

      case "get_metadata": {
        const content = await fs.readFile(path.join(VAULT_PATH, args.relative_path), "utf-8");
        const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
        return { content: [{ type: "text", text: match ? match[1] : "No YAML frontmatter found." }] };
      }

      case "resolve_link": {
        const cleanLink = args.link_text.split('|')[0].trim();
        const files = await getFiles(VAULT_PATH);
        const match = files.find(f => f.toLowerCase().endsWith(`${cleanLink.toLowerCase()}.md`));
        return { content: [{ type: "text", text: match || `Could not find file for [[${cleanLink}]]` }] };
      }
      
      case "search_notes": {
        const files = await getFiles(VAULT_PATH);
        const results = [];
        for (const file of files) {
          const content = await fs.readFile(path.join(VAULT_PATH, file), "utf-8");
          if (content.toLowerCase().includes(args.query.toLowerCase())) results.push(file);
        }
        return { content: [{ type: "text", text: results.join("\n") || "No matches." }] };
      }

      case "create_note": {
        const p = path.join(VAULT_PATH, args.relative_path);
        await fs.mkdir(path.dirname(p), { recursive: true });
        await fs.writeFile(p, args.content, "utf-8");
        return { content: [{ type: "text", text: `Successfully created/updated ${args.relative_path}` }] };
      }

      case "append_note": {
        await fs.appendFile(path.join(VAULT_PATH, args.relative_path), `\n${args.content}`, "utf-8");
        return { content: [{ type: "text", text: `Appended to ${args.relative_path}` }] };
      }

      default: throw new Error("Unknown tool");
    }
  } catch (e) {
    return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);