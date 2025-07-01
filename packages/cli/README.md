# Praxis CLI

Command-line interface for the Praxis framework.

## Installation

```bash
npm install -g @oxog/praxis-cli
```

## Usage

### Create a new project

```bash
praxis create my-app
```

### Generate components

```bash
praxis generate component MyComponent
```

### Start development server

```bash
praxis dev
```

### Build for production

```bash
praxis build
```

### Run tests

```bash
praxis test
```

## Commands

- `create <project-name>` - Create a new Praxis project
- `generate <type> <name>` - Generate components, stores, etc.
- `dev` - Start development server
- `build` - Build for production
- `test` - Run tests
- `lint` - Run linter
- `upgrade` - Upgrade Praxis dependencies

## Options

- `-v, --version` - Show version
- `-h, --help` - Show help
- `--verbose` - Enable verbose logging
- `--no-install` - Skip dependency installation

## Templates

The CLI supports multiple project templates:

- `default` - Basic Praxis setup
- `typescript` - TypeScript configuration
- `tailwind` - With Tailwind CSS
- `full` - Full-featured setup with all tools

## Configuration

Create a `praxis.config.js` file in your project root:

```javascript
export default {
  // CLI configuration
  cli: {
    defaultTemplate: 'typescript',
    packageManager: 'npm' // or 'yarn', 'pnpm'
  }
}
```

## License

MIT