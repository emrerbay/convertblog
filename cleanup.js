const fs = require("fs");
const path = require("path");

function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted file: ${filePath}`);
  }
}

function deleteDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach(file => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteDirectory(curPath);
      } else {
        deleteFile(curPath);
      }
    });
    fs.rmdirSync(dirPath);
    console.log(`Deleted directory: ${dirPath}`);
  }
}

function cleanup() {
  const currentDir = __dirname;
  const protectedFiles = ["convert.js", "cleanup.js", "node_modules"]; // Korunacak dosyalar ve klasörler listesi

  // Tüm .docx dosyalarını sil
  fs.readdirSync(currentDir).forEach(file => {
    if (
      path.extname(file).toLowerCase() === ".docx" &&
      !protectedFiles.includes(file)
    ) {
      deleteFile(path.join(currentDir, file));
    }
  });

  // Tüm .html dosyalarını sil
  fs.readdirSync(currentDir).forEach(file => {
    if (
      path.extname(file).toLowerCase() === ".html" &&
      !protectedFiles.includes(file)
    ) {
      deleteFile(path.join(currentDir, file));
    }
  });

  // metadata.json dosyasını sil (eğer varsa)
  if (!protectedFiles.includes("metadata.json")) {
    deleteFile(path.join(currentDir, "metadata.json"));
  }

  // Oluşturulan klasörleri sil (boş klasörler dahil), ancak korunan klasörleri atla
  fs.readdirSync(currentDir).forEach(file => {
    const filePath = path.join(currentDir, file);
    if (fs.statSync(filePath).isDirectory() && !protectedFiles.includes(file)) {
      deleteDirectory(filePath);
    }
  });

  console.log("Cleanup completed.");
}

cleanup();
