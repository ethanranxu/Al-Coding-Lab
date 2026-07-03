const fs = require('fs');
const path = require('path');

// 目录定义
const CAMP_DIR = path.join(__dirname, 'Portfolio', '2026Term2HolidayCamp');
const MATERIALS_DIR = path.join(__dirname, 'Materials');
const OUTPUT_FILE = path.join(__dirname, 'holiday-camp-data.js');

// 默认补全的学生名单
const DEFAULT_STUDENTS = ["Leo Y.", "Mia C.", "Noah L.", "Ava T.", "Oliver S."];

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function scanMaterials() {
  console.log('开始扫描作品素材目录...');
  const materials = [];
  if (!fs.existsSync(MATERIALS_DIR)) {
    console.log(`提示: 素材目录不存在，正在自动创建 - ${MATERIALS_DIR}`);
    fs.mkdirSync(MATERIALS_DIR);
    return materials;
  }

  const files = fs.readdirSync(MATERIALS_DIR);
  files.forEach(f => {
    const filePath = path.join(MATERIALS_DIR, f);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const ext = path.extname(f).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) {
        materials.push({
          name: f,
          url: `Materials/${f}`.replace(/\\/g, '/'),
          size: formatBytes(stat.size)
        });
      }
    }
  });
  console.log(`成功扫描素材！共找到 ${materials.length} 个素材图片。`);
  return materials;
}

function scanPortfolio() {
  console.log('开始扫描 Holiday Camp 作品目录...');

  if (!fs.existsSync(CAMP_DIR)) {
    console.error(`错误: 目录不存在 - ${CAMP_DIR}`);
    return;
  }

  const items = fs.readdirSync(CAMP_DIR);
  const data = [];
  const scannedNames = new Set();

  items.forEach(itemName => {
    const itemPath = path.join(CAMP_DIR, itemName);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      const name = itemName;
      scannedNames.add(name.toLowerCase());
      
      const isTeacher = name.toLowerCase() === 'ethan';
      const role = isTeacher ? 'teacher' : 'student';

      const works = [];

      // 遍历作者目录下的作品目录
      const authorItems = fs.readdirSync(itemPath);
      authorItems.forEach(authorItem => {
        const authorItemPath = path.join(itemPath, authorItem);
        if (fs.statSync(authorItemPath).isDirectory()) {
          const workTitle = authorItem;
          let htmlFile = null;
          let screenshotFile = null;

          // 扫描作品目录下的文件
          const workFiles = fs.readdirSync(authorItemPath);
          
          // 查找第一个 HTML 文件
          const htmls = workFiles.filter(f => f.toLowerCase().endsWith('.html'));
          if (htmls.length > 0) {
            htmlFile = htmls[0];
          }

          // 寻找图片作为截图
          const images = workFiles.filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
          });

          // 过滤掉明显是素材贴图的文件，优先保留带截图命名的图片
          const bestImage = images.find(f => {
            const name = f.toLowerCase();
            return name.includes('screenshot') || name.includes('cover') || name.includes('preview');
          }) || images.find(f => {
            const name = f.toLowerCase();
            return !name.includes('sheet') && !name.includes('transparent') && !name.includes('raw');
          }) || images[0];

          if (bestImage) {
            screenshotFile = path.join('Portfolio', '2026Term2HolidayCamp', name, workTitle, bestImage);
          }

          // 如果根目录没找到，去 assets 目录找
          const assetsPath = path.join(authorItemPath, 'assets');
          if (!screenshotFile && fs.existsSync(assetsPath) && fs.statSync(assetsPath).isDirectory()) {
            const assetsFiles = fs.readdirSync(assetsPath);
            const assetImages = assetsFiles.filter(f => {
              const ext = path.extname(f).toLowerCase();
              return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
            });
            const bestAssetImage = assetImages.find(f => {
              const name = f.toLowerCase();
              return name.includes('screenshot') || name.includes('cover') || name.includes('preview');
            }) || assetImages.find(f => {
              const name = f.toLowerCase();
              return !name.includes('sheet') && !name.includes('transparent') && !name.includes('raw');
            }) || assetImages[0];

            if (bestAssetImage) {
              screenshotFile = path.join('Portfolio', '2026Term2HolidayCamp', name, workTitle, 'assets', bestAssetImage);
            }
          }

          if (htmlFile) {
            const urlPath = path.join('Portfolio', '2026Term2HolidayCamp', name, workTitle, htmlFile);
            works.push({
              title: workTitle,
              url: urlPath.replace(/\\/g, '/'),
              screenshot: screenshotFile ? screenshotFile.replace(/\\/g, '/') : ''
            });
          }
        }
      });

      data.push({
        name: isTeacher ? 'Ethan' : name,
        role: role,
        works: works
      });
    }
  });

  // 补齐默认名单里没有的同学，保持展示人数（处理 Windows 自动截断名字末尾点号的边缘情况）
  DEFAULT_STUDENTS.forEach(studentName => {
    const normalizedDefault = studentName.toLowerCase().replace(/\./g, '').trim();
    let found = false;
    scannedNames.forEach(scannedName => {
      const normalizedScanned = scannedName.toLowerCase().replace(/\./g, '').trim();
      if (normalizedScanned === normalizedDefault) {
        found = true;
      }
    });
    
    if (!found) {
      data.push({
        name: studentName,
        role: 'student',
        works: []
      });
    }
  });

  // 扫描素材目录
  const materials = scanMaterials();

  // 写入文件
  const outputContent = `window.holidayCampData = ${JSON.stringify(data, null, 2)};\n\nwindow.materialsData = ${JSON.stringify(materials, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf-8');
  console.log(`成功扫描！已将数据写回至 ${OUTPUT_FILE}`);
  console.log('数据清单:');
  data.forEach(p => {
    console.log(`- [${p.role.toUpperCase()}] ${p.name}: ${p.works.length} 个作品`);
  });
}

scanPortfolio();
