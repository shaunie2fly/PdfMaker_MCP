"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const marked_1 = require("marked");
const puppeteer_1 = __importDefault(require("puppeteer"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
function renderMermaidBlocks(markdown) {
    const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    return markdown.replace(mermaidRegex, (_, code) => {
        const tmpBase = path_1.default.join(os_1.default.tmpdir(), `diagram_${Date.now()}_${Math.random()}`);
        const mmdPath = `${tmpBase}.mmd`;
        const svgPath = `${tmpBase}.svg`;
        fs_1.default.writeFileSync(mmdPath, code);
        (0, child_process_1.execSync)(`mmdc -i "${mmdPath}" -o "${svgPath}"`);
        const svg = fs_1.default.readFileSync(svgPath, 'utf-8');
        fs_1.default.unlinkSync(mmdPath);
        fs_1.default.unlinkSync(svgPath);
        return svg;
    });
}
async function markdownToPdf(args) {
    const markdown = fs_1.default.readFileSync(args.input, 'utf-8');
    const withMermaid = renderMermaidBlocks(markdown);
    const htmlContent = (0, marked_1.marked)(withMermaid);
    const styles = args.css ? `<style>${fs_1.default.readFileSync(args.css, 'utf-8')}</style>` : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${htmlContent}</body></html>`;
    const browser = await puppeteer_1.default.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pageOptions = args.page ? JSON.parse(args.page) : { format: 'A4' };
    const pdfBuffer = await page.pdf(pageOptions);
    await browser.close();
    fs_1.default.writeFileSync(args.output, pdfBuffer);
}
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .option('input', { alias: 'i', type: 'string', demandOption: true, describe: 'Input Markdown file' })
    .option('output', { alias: 'o', type: 'string', demandOption: true, describe: 'Output PDF file' })
    .option('css', { alias: 'c', type: 'string', describe: 'Path to a CSS file for theming' })
    .option('page', { alias: 'p', type: 'string', describe: 'JSON string of Puppeteer page.pdf options' })
    .help()
    .argv;
markdownToPdf(argv).catch(err => {
    console.error(err);
    process.exit(1);
});
