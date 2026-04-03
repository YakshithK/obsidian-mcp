# Obsidian MCP Server (Direct File Access)

A lightweight, high-reliability **Model Context Protocol (MCP)** server that connects Claude Desktop directly to your Obsidian vault.

### 🚀 Why this exists
Most Obsidian-to-Claude connectors rely on the "Local REST API" plugin or complex middleware. These often break due to connection timeouts, plugin updates, or vault indexing issues. 

**This server talks directly to your filesystem.** It doesn't require any Obsidian plugins to be installed and works even if Obsidian is closed.

---

## ✨ Features

* **Zero Dependencies in Obsidian:** No plugins required.
* **Recursive Vault Access:** Sees notes inside folders and subfolders.
* **Full-Text Search:** Quickly find notes containing specific keywords.
* **Smart Writing:** Create new notes or append logs to existing ones.
* **Backlink Discovery:** Claude can find notes that link to each other using `[[wikilinks]]`.
* **Safe Handling:** Automatically ignores `.obsidian`, `.git`, and other system folders.

---

## 🛠️ Installation

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Claude Desktop](https://claude.ai/download)

### 2. Setup
Clone this repository to a permanent location on your machine:

```bash
git clone https://github.com/YOUR_USERNAME/your-repo-name.git
cd your-repo-name
npm install
```

---

## ⚙️ Configuration

You need to tell Claude Desktop where to find this server and where your vault is located.

1.  Open your Claude Desktop configuration file:
    * **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
    * **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
2.  Add the following to the `mcpServers` object:

```json
{
  "mcpServers": {
    "obsidian-mcp": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/index.js"],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/ABSOLUTE/PATH/TO/YOUR/VAULT"
      }
    }
  }
}
```

> **Note:** Ensure you use absolute paths. On Windows, use forward slashes `/` or double backslashes `\\`.

---

## 🧰 Available Tools

| Tool | Description |
| :--- | :--- |
| `list_notes` | Returns a list of every markdown file in your vault. |
| `read_note` | Reads the full text of a specific `.md` file. |
| `search_notes` | Searches every file for a specific string. |
| `Notes` | Creates a new note (or overwrites an existing one). |
| `append_note` | Adds text to the bottom of a note (great for logging). |
| `get_backlinks` | Finds all notes that link to a specific note name. |

---

## ⚠️ Important Considerations

* **Direct Overwrites:** The `Notes` tool replaces the entire content of a file. Use `append_note` if you only want to add information.
* **Sync Conflicts:** If you use Obsidian Sync or iCloud, this server writes to the local files. Your sync provider will handle the rest as if you had edited the file manually.
* **Privacy:** This server runs locally on your machine. Your note content is only sent to Claude when you specifically ask it to use these tools.

---

## 🤝 Contributing
If you have a massive vault (10k+ notes) and the search feels slow, feel free to submit a PR to swap the search logic to `ripgrep`!

---

### License
MIT