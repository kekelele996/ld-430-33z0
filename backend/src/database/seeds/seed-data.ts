import { AssetStatus, AssetType, LicenseType, TagCategory } from '../../types/enums';

export const seedCategories = [
  { name: '品牌视觉', icon: 'palette', sortOrder: 1, description: 'Logo、色彩系统和品牌模板' },
  { name: '空间纹理', icon: 'texture', sortOrder: 2, description: '室内、建筑与材质贴图' },
];

export const seedTags = [
  { name: 'minimal', category: TagCategory.Style, usageCount: 8 },
  { name: 'terracotta', category: TagCategory.Color, usageCount: 5 },
  { name: 'gallery', category: TagCategory.Subject, usageCount: 4 },
];

export const seedAssets = [
  {
    title: '陶土色展览海报模板',
    description: '适合小型画廊展览宣传的 PSD 模板，包含可替换图层。',
    assetType: AssetType.Template,
    fileFormat: 'PSD',
    fileUrl: 'https://assets.example.com/poster.psd',
    thumbnailUrl: 'https://picsum.photos/seed/poster-template/640/420',
    fileSize: 24_000_000,
    tags: ['terracotta', 'gallery'],
    uploaderId: 'seed-uploader',
    licenseType: LicenseType.Commercial,
    status: AssetStatus.Published,
  },
  {
    title: '极简摄影素材包',
    description: '高对比静物摄影，可用于编辑排版和 moodboard。',
    assetType: AssetType.Image,
    fileFormat: 'PNG',
    fileUrl: 'https://assets.example.com/photo-pack.png',
    thumbnailUrl: 'https://picsum.photos/seed/photo-pack/640/420',
    fileSize: 5_400_000,
    tags: ['minimal'],
    uploaderId: 'seed-uploader',
    licenseType: LicenseType.Free,
    status: AssetStatus.Published,
  },
];
