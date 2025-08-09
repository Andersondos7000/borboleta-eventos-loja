# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/fcdbda1c-4d21-4b6c-b263-d06022e73e05

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/fcdbda1c-4d21-4b6c-b263-d06022e73e05) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.

## 📚 MCP Documentation

This project includes a comprehensive Model Context Protocol (MCP) integration with 8 active servers. All MCP-related documentation has been organized in the `docs/mcp/` folder:

- **[docs/mcp/README.md](./docs/mcp/README.md)** - Complete index of all MCP documentation
- **[docs/mcp/DOCUMENTACAO_MCP_CONSOLIDADA_PARA_LLM.md](./docs/mcp/DOCUMENTACAO_MCP_CONSOLIDADA_PARA_LLM.md)** - Consolidated documentation for LLMs

### Quick MCP Status Check:
```bash
# Check if MCP system is running
curl http://localhost:3005/health

# View active MCP processes
docker exec queren-app-1 ps aux | grep mcp
```

For complete MCP setup and usage instructions, see the [MCP Documentation Index](./docs/mcp/README.md).
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/fcdbda1c-4d21-4b6c-b263-d06022e73e05) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
