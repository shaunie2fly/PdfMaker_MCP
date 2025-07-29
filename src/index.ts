import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface CliArgs {
  input: string;
  output: string;
  css?: string;
  page?: string;
}

function renderMermaidBlocks(markdown: string): string {
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  return markdown.replace(mermaidRegex, (_, code) => {
    const tmpBase = path.join(os.tmpdir(), `diagram_${Date.now()}_${Math.random()}`);
    const mmdPath = `${tmpBase}.mmd`;
    const svgPath = `${tmpBase}.svg`;
    fs.writeFileSync(mmdPath, code);
    execSync(`mmdc -i "${mmdPath}" -o "${svgPath}"`);
    const svg = fs.readFileSync(svgPath, 'utf-8');
    fs.unlinkSync(mmdPath);
    fs.unlinkSync(svgPath);
    return svg;
  });
}

async function markdownToPdf(args: CliArgs) {
  const markdown = fs.readFileSync(args.input, 'utf-8');
  const withMermaid = renderMermaidBlocks(markdown);
  const htmlContent = marked(withMermaid);
  const styles = args.css ? `<style>${fs.readFileSync(args.css, 'utf-8')}</style>` : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${htmlContent}</body></html>`;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pageOptions = args.page ? JSON.parse(args.page) : { format: 'A4' };
  const pdfBuffer = await page.pdf(pageOptions);
  await browser.close();

  fs.writeFileSync(args.output, pdfBuffer);
}

const argv = yargs(hideBin(process.argv))
  .option('input', { alias: 'i', type: 'string', demandOption: true, describe: 'Input Markdown file' })
  .option('output', { alias: 'o', type: 'string', demandOption: true, describe: 'Output PDF file' })
  .option('css', { alias: 'c', type: 'string', describe: 'Path to a CSS file for theming' })
  .option('page', { alias: 'p', type: 'string', describe: 'JSON string of Puppeteer page.pdf options' })
  .help()
  .argv as unknown as CliArgs;

markdownToPdf(argv).catch(err => {
  console.error(err);
  process.exit(1);
});
