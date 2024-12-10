const fs = require("fs");
const mammoth = require("mammoth");
const { JSDOM } = require("jsdom");
const path = require("path");

function formatUri(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
}

function formatAuthorPicture(author) {
  return `/images/team/09.23/${author.toLowerCase().replace(/ /g, "-")}.jpg`;
}

function getCurrentDate() {
  const options = { day: "2-digit", month: "long", year: "numeric" };
  return new Date().toLocaleDateString("en-GB", options);
}

function findDocxFile() {
  const files = fs.readdirSync(".");
  const docxFile = files.find(
    file => path.extname(file).toLowerCase() === ".docx"
  );
  return docxFile || null;
}

async function docxToHtmlAndJson(docxPath) {
  try {
    const result = await mammoth.convertToHtml(
      { path: docxPath },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Normal'] => p:fresh",
          "r[bold] => b",
          "r[italic] => em",
          "u => u",
          "strike => del",
        ],
      }
    );

    let htmlContent = result.value;
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    const metadata = {};
    const paragraphs = document.querySelectorAll("p");

    paragraphs.forEach(paragraph => {
      const textContent = paragraph.textContent.trim();
      const lowerContent = textContent.toLowerCase();

      if (lowerContent.startsWith("title:")) {
        metadata.title = textContent.replace(/^title:\s*/i, "").trim();
        metadata.uri = formatUri(metadata.title);
        metadata.image = `/images/blog/${metadata.uri}/header.png`;
      } else if (lowerContent.startsWith("author:")) {
        metadata.author = textContent.replace(/^author:\s*/i, "").trim();
        metadata.authorPicture = formatAuthorPicture(metadata.author);
      } else if (lowerContent.startsWith("category:")) {
        metadata.category = textContent.replace(/^category:\s*/i, "").trim();
      } else if (lowerContent.startsWith("duration:")) {
        metadata.duration = parseInt(
          textContent.replace(/^duration:\s*/i, "").trim(),
          10
        );
      } else if (lowerContent.startsWith("description:")) {
        metadata.description = textContent
          .replace(/^description:\s*/i, "")
          .trim();
      } else if (lowerContent.startsWith("meta description:")) {
        metadata.metadata = metadata.metadata || {};
        metadata.metadata.description = textContent
          .replace(/^meta description:\s*/i, "")
          .trim();
      } else if (lowerContent.startsWith("meta keywords:")) {
        metadata.metadata = metadata.metadata || {};
        metadata.metadata.keywords = textContent
          .replace(/^meta keywords:\s*/i, "")
          .trim();
      }
    });

    metadata.date = getCurrentDate();

    const outputDir = metadata.uri;
    const outputHtmlPath = `${metadata.uri}.html`;
    const outputJsonPath = "metadata.json";

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const blogIndex = document.body.innerHTML.indexOf("--B");
    if (blogIndex !== -1) {
      document.body.innerHTML = document.body.innerHTML.slice(
        blogIndex + "--B".length
      );
    }

    document.querySelectorAll("h1,h2, h3, h4, h5, h6").forEach(heading => {
      heading.removeAttribute("id");
      const aTag = heading.querySelector("a[id]");
      if (aTag) {
        heading.innerHTML = heading.textContent;
      }
      heading.innerHTML = heading.innerHTML.replace(/&amp;/g, "&");
    });

    document.querySelectorAll("strong").forEach(strongTag => {
      const bTag = document.createElement("b");
      bTag.innerHTML = strongTag.innerHTML;
      strongTag.replaceWith(bTag);
    });

    document.querySelectorAll("a").forEach(anchor => {
      const href = anchor.getAttribute("href");
      if (href) {
        anchor.setAttribute("target", "_blank");
        if (!href.startsWith("https://enhencer.com/")) {
          anchor.setAttribute("rel", "noopener noreferrer");
        } else {
          anchor.removeAttribute("rel");
        }
      }
    });

    const regex = /INTEXT-(\d+)-\((.+?)\)/g;
    document.body.innerHTML = document.body.innerHTML.replace(
      regex,
      (match, number, alt) => {
        return `<img
      loading="lazy"
      src="/images/blog/${metadata.uri}/${number}.png"
      alt="${alt}"
    />`;
      }
    );

    const finalHtmlContent = document.body.innerHTML;

    fs.writeFileSync(outputHtmlPath, finalHtmlContent, "utf8");
    fs.writeFileSync(
      outputJsonPath,
      JSON.stringify(
        {
          title: metadata.title,
          author: metadata.author,
          date: metadata.date,
          image: metadata.image,
          uri: metadata.uri,
          authorPicture: metadata.authorPicture,
          category: metadata.category,
          duration: metadata.duration,
          description: metadata.description,
          metadata: metadata.metadata,
        },
        null,
        2
      ),
      "utf8"
    );

    console.log(
      `Directory created and files successfully generated! Directory: ${outputDir}, HTML: ${outputHtmlPath}, JSON: ${outputJsonPath}`
    );
  } catch (error) {
    console.error("Error occurred while creating files:", error);
  }
}

// Get the file path from command line argument or automatically found .docx file
const docxPath = process.argv[2] || findDocxFile();

if (!docxPath) {
  console.error(
    "Error: No .docx file found. Please specify a .docx file or add one to the directory."
  );
  process.exit(1);
}

docxToHtmlAndJson(docxPath);

