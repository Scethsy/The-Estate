import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = { title: "Rules | Estate", description: "Complete rules, board, and deed schedules for Estate." };

export default async function RulesPage() {
  const markdown = await readFile(path.join(process.cwd(), "docs", "RULES.md"), "utf8");
  return <main className="rules-page"><nav><Link href="/">← Back to game</Link><span>ESTATE / RULEBOOK</span></nav><article className="rules-article"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></article></main>;
}
