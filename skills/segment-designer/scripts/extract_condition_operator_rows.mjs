#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TABLE_PATH = path.resolve(
  SCRIPT_DIR,
  "..",
  "references",
  "client",
  "catalogs",
  "condition-operators.md",
);
const TABLE_HEADERS = ["Group", "Operator pattern", "Options", "Functionality", "Value guidance"];

class CliError extends Error {}

function main(argv) {
  const args = parseArguments(argv);
  const requested = parseRequestedOperators(args.operators, args.operatorsCsv);
  if (requested.length === 0) {
    throw new CliError("provide at least one operator name");
  }

  const rows = parseOperatorTable(DEFAULT_TABLE_PATH);
  const matches = filterRows(rows, requested);
  const matchedOperators = new Set(matches.flatMap((row) => row.matched_operators));
  const missing = requested.filter((operator) => !matchedOperators.has(operator));

  if (args.format === "json") {
    process.stdout.write(`${JSON.stringify(matches, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderMarkdown(matches, args.showMatches)}\n`);
  }

  if (missing.length > 0) {
    process.stderr.write(`Missing operators: ${missing.join(", ")}\n`);
    return args.strict ? 1 : 0;
  }
  return 0;
}

function parseArguments(argv) {
  const args = {
    operators: [],
    operatorsCsv: "",
    format: "markdown",
    showMatches: false,
    strict: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      printHelp();
      process.exit(0);
    }
    if (argument === "--show-matches") {
      args.showMatches = true;
      continue;
    }
    if (argument === "--strict") {
      args.strict = true;
      continue;
    }
    if (argument === "--operators" || argument === "--format") {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new CliError(`${argument} requires a value`);
      }
      if (argument === "--operators") args.operatorsCsv = value;
      if (argument === "--format") args.format = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--operators=")) {
      args.operatorsCsv = argument.slice("--operators=".length);
      continue;
    }
    if (argument.startsWith("--format=")) {
      args.format = argument.slice("--format=".length);
      continue;
    }
    if (argument.startsWith("-")) {
      throw new CliError(`unrecognized argument: ${argument}`);
    }
    args.operators.push(argument);
  }

  if (!new Set(["markdown", "json"]).has(args.format)) {
    throw new CliError(`invalid format: ${args.format}`);
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    "Usage: extract_condition_operator_rows.mjs [options] OPERATOR...\n\n" +
      "Extract condition-operator table rows matching exact operator names.\n\n" +
      "Options:\n" +
      "  --operators VALUE   Comma-separated operator names.\n" +
      "  --format VALUE      Output format: markdown or json.\n" +
      "  --show-matches      Add matched exact operators to Markdown output.\n" +
      "  --strict            Exit with status 1 when an operator is not found.\n" +
      "  -h, --help          Show this help.\n",
  );
}

function parseRequestedOperators(positional, csvValue) {
  const tokens = [];
  for (const rawValue of [...positional, csvValue || ""]) {
    for (const token of rawValue.split(/[\s,;]+/u)) {
      const normalized = normalizeOperator(token);
      if (normalized && !tokens.includes(normalized)) tokens.push(normalized);
    }
  }
  return tokens;
}

function normalizeOperator(value) {
  return value.trim().replace(/^`|`$/gu, "").toUpperCase();
}

function parseOperatorTable(tablePath) {
  if (!fs.statSync(tablePath, {throwIfNoEntry: false})?.isFile()) {
    throw new Error(`operator table not found: ${tablePath}`);
  }

  const rows = [];
  for (const line of fs.readFileSync(tablePath, "utf8").split(/\r?\n/u)) {
    if (!line.startsWith("| ")) continue;
    const cells = parseMarkdownRow(line);
    if (
      cells.length === 0 ||
      cells.every((cell, index) => cell === TABLE_HEADERS[index]) ||
      cells.every((cell) => /^-*$/u.test(cell))
    ) {
      continue;
    }
    if (cells.length !== TABLE_HEADERS.length) {
      throw new Error(`unexpected table row shape in ${tablePath}: ${line}`);
    }

    const row = Object.fromEntries(TABLE_HEADERS.map((header, index) => [header, cells[index]]));
    row.expanded_operators = expandOperatorPatterns(row["Operator pattern"], row.Options);
    rows.push(row);
  }
  return rows;
}

function parseMarkdownRow(line) {
  return line.trim().replace(/^\||\|$/gu, "").split("|").map((cell) => cell.trim());
}

function expandOperatorPatterns(patternCell, optionsCell) {
  const expanded = [];
  for (const match of patternCell.matchAll(/`([^`]+)`/gu)) {
    const expression = match[1];
    const placeholderMatch = expression.match(/\{([^}]+)\}/u);
    if (placeholderMatch) {
      const placeholder = placeholderMatch[1];
      for (const option of getPlaceholderOptions(optionsCell, placeholder)) {
        expanded.push(expression.replace(`{${placeholder}}`, option));
      }
      continue;
    }
    for (const operator of expression.split(",")) {
      const normalized = normalizeOperator(operator);
      if (normalized) expanded.push(normalized);
    }
  }
  return uniquePreserveOrder(expanded);
}

function getPlaceholderOptions(optionsCell, placeholder) {
  const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = optionsCell.match(new RegExp(`\\b${escapedPlaceholder}:\\s*(.+)`, "u"));
  if (!match) {
    throw new Error(`missing options for placeholder {${placeholder}}: ${optionsCell}`);
  }
  return match[1]
    .split(",")
    .map(normalizeOperator)
    .filter(Boolean);
}

function uniquePreserveOrder(values) {
  return [...new Set(values)];
}

function filterRows(rows, requested) {
  const requestedSet = new Set(requested);
  return rows.flatMap((row) => {
    const matched = row.expanded_operators.filter((operator) => requestedSet.has(operator));
    return matched.length > 0 ? [{...row, matched_operators: matched}] : [];
  });
}

function renderMarkdown(rows, showMatches) {
  const headers = showMatches ? [...TABLE_HEADERS, "Matched operators"] : TABLE_HEADERS;
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];
  for (const row of rows) {
    const cells = TABLE_HEADERS.map((header) => String(row[header]));
    if (showMatches) cells.push(row.matched_operators.join(", "));
    lines.push(`| ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  if (error instanceof CliError) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  }
}
