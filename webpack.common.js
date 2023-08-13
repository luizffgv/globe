const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const CnameWebpackPlugin = require("cname-webpack-plugin");

const scriptsPath = path.join(__dirname, "src/scripts");
const globalScriptsPath = path.join(scriptsPath, "global");

/**
 * Name of the global entry point.
 */
const globalEntryName = "global";

/**
 * Scripts that will run before any other entries in all pages.
 */
const globalScripts = fs
  .readdirSync(globalScriptsPath)
  .map((script) => path.join(globalScriptsPath, script));

/* ----------------------- Populate pages and entries ----------------------- */

/**
 * Represents an HTML page.
 */
class Page {
  /**
   * Constructs a {@link Page}.
   *
   * @param {string} name - Name of the page.
   */
  constructor(name) {
    /**
     * Name of the page.
     * @type {string}
     */
    this.name = name;
  }

  /**
   * Absolute path to the page directory.
   */
  get path() {
    return path.join(__dirname, `src/pages/${this.name}`);
  }

  /**
   * The page's entry point.
   */
  get entry() {
    const entryPath = path.join(this.path, "entry.ts");

    if (fs.existsSync(entryPath)) return entryPath;
    return null;
  }

  /**
   * Absolute path to the page's HTML template.
   */
  get html() {
    return path.join(this.path, "template.html");
  }

  /**
   * Page chunks.
   */
  get chunks() {
    const chunks = [globalEntryName];
    if (this.entry != null) chunks.push(this.name);

    return chunks;
  }

  asHtmlPlugin() {
    return new HtmlWebpackPlugin({
      template: this.html,
      filename: `${this.name}.html`,
      chunks: this.chunks,
      chunksSortMode: "manual",
    });
  }
}

const pages = fs
  .readdirSync(path.join(__dirname, "src/pages"))
  .map((name) => new Page(name));

/**
 * @type {{[name: string]: import("webpack").Entry}}
 */
const entries = pages
  .map((page) =>
    page.entry != null
      ? {
          [page.name]: page.entry,
        }
      : {}
  )
  .reduce((lhs, rhs) => Object.assign(lhs, rhs));

if (entries[globalEntryName] != undefined)
  throw new Error(
    `Entry "${globalEntryName}" is already defined. Do not use "${globalEntryName}" as a page name.`
  );

entries[globalEntryName] = globalScripts;

/* ----------------------------- Create plugins ----------------------------- */

const assetsCopyPlugin = new CopyPlugin({
  patterns: [{ from: "src/assets", to: "assets" }],
});

const pagePlugins = pages.map((page) => page.asHtmlPlugin());

const cnamePlugin = new CnameWebpackPlugin({ domain: "globe.luizf.dev" });

const plugins = [assetsCopyPlugin, ...pagePlugins, cnamePlugin];

/* ----------------------------- Webpack config ----------------------------- */

module.exports = {
  mode: "development",
  entry: entries,
  plugins: plugins,
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        oneOf: [
          {
            // Imports the CSS as a string
            resourceQuery: /string/,
            use: ["to-string-loader", "css-loader", "sass-loader"],
          },
          {
            // Applies the style sheet to the document
            resourceQuery: /apply/,
            use: ["style-loader", "css-loader", "sass-loader"],
          },
          {
            // Imports a CSSStyleSheet object
            resourceQuery: /sheet/,
            use: [
              {
                loader: "css-loader",
                options: { exportType: "css-style-sheet" },
              },
              "sass-loader",
            ],
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      Scripts: path.resolve(__dirname, "src/scripts/"),
      Styles: path.resolve(__dirname, "src/styles/"),
    },
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
};
