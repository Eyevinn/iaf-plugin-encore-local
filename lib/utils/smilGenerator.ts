import * as fs from "fs";
import * as path from "path";


export function getFilesByName(dir: string, fileName: string): string[] {
  let files: string[] = [];
  fs.readdirSync(dir).forEach(file => {
    files.push(file);
  });
  return files;
}

export function createSMILFile(dir: string, fileName: string): void {
  const outputFolder = dir;
  let files: string[] = getFilesByName(outputFolder, fileName);
  let content  = `<?xml version="1.0" encoding="UTF-8"?>`;
  content += `<smil>`;
  content += `<body>`;
  content += `<alias value="${fileName}" />`;
  content += `<switch>`;
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (file.includes("SURROUND")) {
      content += `<audio name="${file}" systemLanguage="eng" subtitleName="SURROUND"/>`;
    } else if (file.includes("STEREO")) {
      content += `<audio name="${file}" systemLanguage="eng" subtitleName="STEREO"/>`;
    } else if (!file.includes("thumb") && file.includes("mp4")) { 
      content += `<video name="${file}" systemLanguage="eng" audioName="English"/>`;
    }
  }
  content += `</switch>`;
  content += `</body>`;
  content += `</smil>`;
  fs.writeFileSync(path.join(outputFolder, `${path.basename(fileName, path.extname(fileName))}.smil`), content);
}
