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
  let files: string[] = getFilesByName(dir, fileName);
  let smil  = `<?xml version="1.0" encoding="UTF-8"?>`;
  smil += `<smil>`;
  smil += `<body>`;
  smil += `<alias value="${fileName}" />`;
  smil += `<switch>`;
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    if (file.includes("SURROUND")) {
      //smil += `<audio src="${destination}/${file}" systemLanguage="eng" subtitleName="SURROUND"/>`;
      continue;
    } else if (file.includes("STEREO")) {
      //smil += `<audio src="${destination}/${file}" systemLanguage="eng" subtitleName="STEREO"/>`;
      continue;
    } else if ("mp4" === path.extname(file)) { 
      smil += `<video src="${file}" systemLanguage="eng" audioName="English"/>`;
    } else {
      continue;
    }
  }
  smil += `</switch>`;
  smil += `</body>`;
  smil += `</smil>`;
  fs.writeFileSync(path.join(dir, `${fileName}.smil`), smil);
}
