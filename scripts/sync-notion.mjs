#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

const token = process.env.NOTION_TOKEN;
const pageId = (process.env.NOTION_PAGE_ID || "").replace(/-/g, "").trim();
const MAX_CHARS = 4000;

if (!token || !pageId) {
  console.error("缺少 NOTION_TOKEN 或 NOTION_PAGE_ID");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  "Notion-Version": "2022-06-28",
};

async function fetchChildren(blockId) {
  const results = [];
  let cursor;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Notion API ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

function richText(block) {
  const data = block[block.type] || {};
  return (data.rich_text || []).map((item) => item.plain_text || "").join("");
}

async function renderBlocks(blocks, depth, out) {
  const indent = "  ".repeat(depth);
  for (const block of blocks) {
    const text = richText(block);
    switch (block.type) {
      case "paragraph":
        out.push(text ? indent + text : "");
        if (text) out.push("");
        break;
      case "heading_1":
      case "heading_2":
      case "heading_3":
        if (text) out.push(indent + text, "");
        break;
      case "bulleted_list_item":
      case "numbered_list_item":
        if (text) out.push(indent + "· " + text);
        break;
      case "to_do":
        out.push(indent + (block.to_do.checked ? "[x] " : "[ ] ") + text);
        break;
      case "quote":
      case "callout":
      case "code":
        if (text) out.push(indent + text, "");
        break;
      case "toggle":
        if (text) out.push(indent + text);
        break;
      case "divider":
        out.push(indent + "----------", "");
        break;
      case "table_row":
        out.push(
          indent +
            block.table_row.cells
              .map((cells) => cells.map((cell) => cell.plain_text || "").join(""))
              .join(" | ")
        );
        break;
      case "child_page":
        if (block.child_page && block.child_page.title) {
          out.push(indent + block.child_page.title, "");
        }
        break;
      case "column_list":
      case "column":
      case "synced_block":
      case "template":
        break;
      default:
        if (text) out.push(indent + text);
        break;
    }
    if (block.has_children && block.type !== "table_row" && depth < 5) {
      const children = await fetchChildren(block.id);
      await renderBlocks(children, depth + 1, out);
    }
  }
}

const blocks = await fetchChildren(pageId);
const lines = [];
await renderBlocks(blocks, 0, lines);
let text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

if (!text) {
  throw new Error("Notion 页面里没有可输出的文字");
}
if ([...text].length > MAX_CHARS) {
  text = [...text].slice(0, MAX_CHARS).join("") + "\n……";
}

await writeFile(new URL("../notice.txt", import.meta.url), text + "\n", "utf8");
console.log(`已生成 notice.txt（${[...text].length} 字）`);
