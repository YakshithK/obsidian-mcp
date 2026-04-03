# 🚀 Obsidian MCP Ultimate (Direct File Access)

The most reliable way to connect **Claude Desktop** to your **Obsidian Vault**. 

Unlike other MCP servers that require the "Local REST API" or "Obsidian MCP" plugins (which frequently break or require Obsidian to be open), this server uses **Direct File Access**. It talks straight to your filesystem, making it faster, more stable, and functional even when Obsidian is closed.

## ✨ Why This Version?
Most Obsidian MCPs only allow you to read or overwrite entire files. This "Ultimate" edition adds power-user features:
* **Partial Editing:** Use `patch_note` to find-and-replace text without rewriting the whole file.
* **Wikilink Resolution:** Claude can now "follow" `[[Links]]` to find the actual file path.
* **Metadata Extraction:** Deep-dive into YAML frontmatter and properties.
* **File Management:** Move, rename, delete, and create directories.

---

## 🛠️ Setup

### 1. Installation
Clone this repo to a permanent folder on your computer:
```bash
git clone https://github.com/YOUR_USERNAME/obsidian-mcp-ultimate.git
cd obsidian-mcp-ultimate
npm install
```

### 2. Configuration
Add the server to your Claude Desktop config file:
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/index.js"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/ABSOLUTE/PATH/TO/YOUR/VAULT"
      }
    }
  }
}
```
*(Note: Use forward slashes `/` even on Windows, or double backslashes `\\`.)*

---

## 🧰 The Toolset

| Tool | Description |
| :--- | :--- |
| `list_notes` | Recursively lists all `.md` files in your vault. |
| `read_note` | Reads the full content of a note. |
| `patch_note` | **(New)** Find-and-replace specific text within a note. |
| `search_notes` | Full-text search across the entire vault. |
| `resolve_link` | **(New)** Converts a `[[Wikilink]]` into a usable file path. |
| `Youtube` | **(New)** Extracts YAML frontmatter/properties. |
| `Notes` | Creates or overwrites a note. |
| `append_note` | Quickly adds text to the bottom of a note. |
| `move_note` | **(New)** Rename or move files and folders. |
| `delete_note` | **(New)** Permanently deletes a note. |
| `create_directory`| **(New)** Creates new folders in your vault. |

---

## 💡 Usage Pro-Tips

### Following Links
If Claude sees a link like `[[Meeting Notes 2024]]`, it might not know where that file is. It should first call `resolve_link(link_text: "Meeting Notes 2024")` to get the path, then `read_note`.

### Safe Editing
Instead of asking Claude to "Update my note," ask it to:
> *"Find the line starting with 'Status:' and replace it with 'Status: Completed' in my project note."*

This triggers `patch_note`, which is much safer for large files than overwriting the entire thing.

---

## ⚠️ Safety Disclaimer
This server has **delete** and **overwrite** capabilities. While it only acts on your command, it is highly recommended to have **Obsidian Sync**, **Git**, or a system backup (Time Machine/File History) enabled for your vault.

## 🤝 Contributing
Found a bug or want to add a `ripgrep` integration for massive vaults? PRs are welcome!

### License
MIT