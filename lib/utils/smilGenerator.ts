import * as fs from "fs";
import * as path from "path";


export function getFilesByName(dir: string, fileName: string): string[] {
  let files: string[] = [];
  fs.readdirSync(dir).forEach(file => {
      if (file.indexOf(fileName) > -1) {
          files.push(file);
      }
  });
  return files;
}

export function createSMILFile(dir: string, fileName: string): void {
  const outputFolder = path.join(dir, path.basename(fileName, path.extname(fileName)));
  let files: string[] = getFilesByName(outputFolder, fileName);
  let smil  = `<?xml version="1.0" encoding="UTF-8"?>`;
  smil += `<smil>`;
  smil += `<body>`;
  smil += `<alias value="${fileName}" />`;
  smil += `<switch>`;
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (file.includes("SURROUND")) {
      smil += `<audio name="${file}" systemLanguage="eng" subtitleName="SURROUND"/>`;
    } else if (file.includes("STEREO")) {
      smil += `<audio name="${file}" systemLanguage="eng" subtitleName="STEREO"/>`;
    } else if (!file.includes("thumb")) { 
      smil += `<video name="${file}" systemLanguage="eng" audioName="English"/>`;
    }
  }
  smil += `</switch>`;
  smil += `</body>`;
  smil += `</smil>`;
  fs.writeFileSync(path.join(outputFolder, `${fileName}-config.smil`), smil);
}
